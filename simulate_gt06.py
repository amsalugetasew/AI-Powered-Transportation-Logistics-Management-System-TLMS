import socket
import time
import binascii
import random

# IMEI must match a vehicle's device_imei in the database.
IMEI = "012345678901234"

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

def send_login(sock):
    print(f"Sending Login for IMEI {IMEI}")
    # 01 23 45 67 89 01 23 45
    imei_padded = "0" + IMEI
    imei_bytes = binascii.unhexlify(imei_padded)
    
    # protocol 0x01
    content = imei_bytes
    packet_length = len(content) + 5
    
    payload = bytes([packet_length, 0x01]) + content + b'\x00\x01' # Serial Number 00 01
    crc = crc16(payload)
    
    packet = b'\x78\x78' + payload + crc + b'\x0d\x0a'
    sock.send(packet)
    
    # Wait for response
    resp = sock.recv(1024)
    print(f"Login Response: {binascii.hexlify(resp)}")

def send_location(sock, lat, lng, speed, heading):
    print(f"Sending Location: Lat {lat}, Lng {lng}, Speed {speed}")
    
    # Convert lat/lng to GT06 format
    lat_int = int(abs(lat) * 1800000)
    lng_int = int(abs(lng) * 1800000)
    
    lat_bytes = lat_int.to_bytes(4, 'big')
    lng_bytes = lng_int.to_bytes(4, 'big')
    
    # Course and Status
    course_int = heading & 0x03FF
    if lat > 0:
        course_int |= 0x0400 # North
    if lng < 0:
        course_int |= 0x0800 # West
        
    course_bytes = course_int.to_bytes(2, 'big')
    
    speed_byte = bytes([int(speed)])
    
    # Dummy datetime: Year Month Day Hour Min Sec
    dt_bytes = b'\x16\x06\x03\x0C\x00\x00' # 2022-06-03 12:00:00 (just dummy)
    
    # Location protocol 0x12
    content = dt_bytes + lat_bytes + lng_bytes + speed_byte + course_bytes
    packet_length = len(content) + 5
    
    payload = bytes([packet_length, 0x12]) + content + b'\x00\x02' # Serial Number 00 02
    crc = crc16(payload)
    
    packet = b'\x78\x78' + payload + crc + b'\x0d\x0a'
    sock.send(packet)

if __name__ == "__main__":
    host = '127.0.0.1'
    port = 5000
    
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.connect((host, port))
        send_login(s)
        time.sleep(1)
        
        # Simulate moving around Addis Ababa
        start_lat = 9.0300
        start_lng = 38.7400
        
        for i in range(10):
            send_location(s, start_lat, start_lng, speed=40.0, heading=90)
            start_lat += 0.0001
            start_lng += 0.0001
            time.sleep(3)
            
    except Exception as e:
        print(f"Connection failed: {e}")
    finally:
        s.close()
