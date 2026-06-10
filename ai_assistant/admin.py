from django.contrib import admin
from .models import ChatConversation, ChatMessage, KnowledgeBase


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'started_at', 'ended_at')
    list_filter = ('started_at', 'user')
    search_fields = ('title', 'user__username')
    date_hierarchy = 'started_at'
    ordering = ('-started_at',)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'role', 'query_type', 'response_format', 'timestamp')
    list_filter = ('role', 'query_type', 'response_format', 'timestamp')
    search_fields = ('content', 'conversation__title')
    date_hierarchy = 'timestamp'
    ordering = ('-timestamp',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('conversation', 'conversation__user')


@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'category', 'question', 'is_active', 'created_at')
    list_filter = ('category', 'is_active', 'created_at')
    search_fields = ('question', 'answer', 'keywords')
    ordering = ('category', 'question')
    list_editable = ('is_active',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('category', 'question', 'answer', 'is_active')
        }),
        ('Search & Examples', {
            'fields': ('keywords', 'examples')
        }),
    )
