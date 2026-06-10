from django.db import models
from django.conf import settings


class ChatConversation(models.Model):
    """Store chat conversation sessions"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversations')
    title = models.CharField(max_length=200, default='New Conversation')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"


class ChatMessage(models.Model):
    """Store individual messages in conversations"""
    ROLE_CHOICES = (
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    )
    
    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    query_type = models.CharField(max_length=50, null=True, blank=True)  # query, report, analysis, export
    response_format = models.CharField(max_length=20, null=True, blank=True)  # text, table, chart, excel, csv, pdf
    file_path = models.CharField(max_length=500, null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)  # Store analysis, chart data, etc.
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.role}: {self.content[:50]}"


class KnowledgeBase(models.Model):
    """Store domain knowledge for better AI responses"""
    category = models.CharField(max_length=100)  # vehicles, drivers, maintenance, etc.
    question = models.TextField()
    answer = models.TextField()
    keywords = models.JSONField(default=list)
    examples = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = 'Knowledge Base'
        ordering = ['category', 'question']
    
    def __str__(self):
        return f"{self.category}: {self.question[:50]}"
