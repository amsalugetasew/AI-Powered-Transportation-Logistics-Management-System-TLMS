import json
from channels.generic.websocket import AsyncWebsocketConsumer

class LiveTrackingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join the global 'live_tracking' group
        await self.channel_layer.group_add(
            'live_tracking',
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave the group
        await self.channel_layer.group_discard(
            'live_tracking',
            self.channel_name
        )

    # Receive message from room group
    async def vehicle_location_update(self, event):
        data = event['data']
        # Send message to WebSocket
        await self.send(text_data=json.dumps(data))
