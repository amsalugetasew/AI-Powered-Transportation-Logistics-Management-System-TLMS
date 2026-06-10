from django.urls import path
from .views import (
    ChatAssistantView,
    ChatHistoryView,
    ConversationDetailView,
    MessageDetailView,
    DownloadFileView,
    KnowledgeBaseView
)

urlpatterns = [
    path('chat/', ChatAssistantView.as_view(), name='ai-chat'),
    path('history/', ChatHistoryView.as_view(), name='chat-history'),
    path('conversation/<int:conversation_id>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('message/<int:message_id>/', MessageDetailView.as_view(), name='message-detail'),
    path('download/<int:message_id>/', DownloadFileView.as_view(), name='download-file'),
    path('knowledge/', KnowledgeBaseView.as_view(), name='knowledge-base'),
]
