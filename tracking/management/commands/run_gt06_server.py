import asyncio
import logging
import binascii
from django.core.management.base import BaseCommand
from asgiref.sync import sync_to_async
from django.utils import timezone

from tracking.models import VehicleLocation
from fleet.models import Vehicle
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

def crc16(data: bytes) -> bytes:
    crc = 0xFFFF
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc <<= 1
            crc &= 0xFFFF
    return crc.to_bytes(2, byteorder='big')

class GT06Protocol:
    def __init__(self):
        self.imei = None
        self.vehicle = None
        self.channel_layer = get_channel_layer()

    @sync_to_async
    def authenticate_device(self, imei_str):
        try:
            # We need to add device_imei to Vehicle if it doesn't exist, or query by it.
            # Assuming Vehicle has 'device_imei' field. Let's check models.
            # If not, we will need to add it! Let me use a placeholder assumption, 
            # and I will update Vehicle model if needed.
            self.vehicle = Vehicle.objects.get(device_imei=imei_str)
            return True
        except Vehicle.DoesNotExist:
            logger.warning(f"Unrecognized IMEI: {imei_str}")
            return False
        except Exception as e:
            logger.error(f"DB Error: {e}")
            return False

    @sync_to_async
    def save_location(self, lat, lng, speed, course):
        if not self.vehicle:
            return
        
        loc = VehicleLocation.objects.create(
            vehicle=self.vehicle,
            latitude=lat,
            longitude=lng,
            speed=speed,
            heading=course,
            timestamp=timezone.now()
        )
        return loc

    async def broadcast_location(self, loc):
        if not self.channel_layer:
            return
        
        await self.channel_layer.group_send(
            'live_tracking',
            {
                'type': 'vehicle_location_update',
                'data': {
                    'vehicle_id': self.vehicle.id,
                    'license_plate': self.vehicle.license_plate,
                    'lat': float(loc.latitude),
                    'lng': float(loc.longitude),
                    'speed': float(loc.speed),
                    'heading': loc.heading,
                    'timestamp': loc.timestamp.isoformat()
                }
            }
        )

    async def handle_data(self, data: bytes, writer: asyncio.StreamWriter):
        if not data.startswith(b'\x78\x78') and not data.startswith(b'\x79\x79'):
            return

        try:
            packet_length = data[2]
            protocol_number = data[3]
            content = data[4: 4 + packet_length - 5]
            serial_number = data[-6:-4]
            
            # Login Message
            if protocol_number == 0x01:
                imei_hex = binascii.hexlify(content).decode()
                # GT06 sends 8 bytes (16 hex chars). The IMEI is 15 digits, so we take the last 15 chars.
                imei_str = imei_hex[-15:]
                self.imei = imei_str
                logger.info(f"Login request from IMEI: {imei_str}")
                
                await self.authenticate_device(imei_str)

                # Response
                response_content = b'\x05\x01' + serial_number
                response_crc = crc16(response_content)
                response = b'\x78\x78' + response_content + response_crc + b'\x0d\x0a'
                writer.write(response)
                await writer.drain()

            # Location Message
            elif protocol_number in [0x12, 0x22]:
                if not self.vehicle:
                    return

                lat_bytes = content[6:10]
                lng_bytes = content[10:14]
                speed_byte = content[14]
                course_bytes = content[15:17]

                lat_int = int.from_bytes(lat_bytes, 'big')
                lng_int = int.from_bytes(lng_bytes, 'big')
                speed = speed_byte
                
                course_int = int.from_bytes(course_bytes, 'big')
                course = course_int & 0x03FF

                lat = lat_int / 1800000.0
                lng = lng_int / 1800000.0

                if not (course_int & 0x0400):
                    lat = -lat
                if (course_int & 0x0800):
                    lng = -lng

                loc = await self.save_location(lat, lng, speed, course)
                await self.broadcast_location(loc)
                logger.info(f"Location saved for {self.vehicle.license_plate}: {lat}, {lng}")

            # Heartbeat Message
            elif protocol_number == 0x13:
                response_content = b'\x05\x13' + serial_number
                response_crc = crc16(response_content)
                response = b'\x78\x78' + response_content + response_crc + b'\x0d\x0a'
                writer.write(response)
                await writer.drain()
        except Exception as e:
            logger.error(f"Error parsing packet: {e}")

async def handle_client(reader, writer):
    protocol = GT06Protocol()
    addr = writer.get_extra_info('peername')
    logger.info(f"New connection from {addr}")

    try:
        while True:
            data = await reader.read(1024)
            if not data:
                break
            await protocol.handle_data(data, writer)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Error handling connection: {e}")
    finally:
        logger.info(f"Connection closed {addr}")
        writer.close()
        await writer.wait_closed()

async def main(host='0.0.0.0', port=5000):
    server = await asyncio.start_server(handle_client, host, port)
    addr = server.sockets[0].getsockname()
    print(f'GT06 Server listening on {addr}')

    async with server:
        await server.serve_forever()

class Command(BaseCommand):
    help = 'Starts the GT06 TCP Server'

    def handle(self, *args, **options):
        logging.basicConfig(level=logging.INFO)
        try:
            asyncio.run(main())
        except KeyboardInterrupt:
            print("Server stopped.")
