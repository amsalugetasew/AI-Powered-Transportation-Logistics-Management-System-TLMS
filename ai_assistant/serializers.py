from rest_framework import serializers
from .models import ChatConversation, ChatMessage, KnowledgeBase


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'query_type', 'response_format', 'metadata', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class ChatConversationSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatConversation
        fields = ['id', 'title', 'started_at', 'ended_at', 'messages', 'message_count']
        read_only_fields = ['id', 'started_at']
    
    def get_message_count(self, obj):
        return obj.messages.count()


class KnowledgeBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBase
        fields = ['id', 'category', 'question', 'answer', 'keywords', 'examples', 'is_active']
        read_only_fields = ['id']
