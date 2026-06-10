from django.apps import AppConfig


class FleetConfig(AppConfig):
    name = 'fleet'
    
    def ready(self):
        """Import signal handlers when app is ready"""
        import fleet.signals
