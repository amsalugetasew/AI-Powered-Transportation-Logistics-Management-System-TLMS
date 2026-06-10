from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from .analyzer import QueryAnalyzer
from .query_generator import QueryGenerator
from .formatter import ResponseFormatter
from .models import ChatConversation, ChatMessage, KnowledgeBase
from .serializers import ChatConversationSerializer, ChatMessageSerializer
import base64
import logging

logger = logging.getLogger(__name__)


class ChatAssistantView(APIView):
    """Main chat endpoint for AI Assistant"""
    
    def post(self, request):
        user_query = request.data.get('message', '').strip()
        conversation_id = request.data.get('conversation_id')
        
        if not user_query:
            return Response(
                {'error': 'Message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get or create conversation
            if conversation_id:
                try:
                    conversation = ChatConversation.objects.get(id=conversation_id, user=request.user)
                except ChatConversation.DoesNotExist:
                    conversation = ChatConversation.objects.create(
                        user=request.user,
                        title=user_query[:50]
                    )
            else:
                conversation = ChatConversation.objects.create(
                    user=request.user,
                    title=user_query[:50]
                )
            
            # Save user message
            ChatMessage.objects.create(
                conversation=conversation,
                role='user',
                content=user_query
            )
            
            # Step 1: Analyze query using Groq AI
            analyzer = QueryAnalyzer()
            analysis = analyzer.analyze_query(user_query)
            
            logger.info(f"Query analysis: {analysis}")
            
            # Handle help queries - but only if explicitly asking for help - but only if explicitly asking for help
            if analysis.get('intent') == 'help' and not analysis.get('entities'):
                result = self._get_help_response()
                ai_message = ChatMessage.objects.create(
                    conversation=conversation,
                    role='assistant',
                    content=str(result),
                    query_type='help',
                    response_format='text'
                )
                
                return Response({
                    'conversation_id': conversation.id,
                    'message_id': ai_message.id,
                    'result': result,
                    'analysis': {'intent': 'help'}
                })
            
            # Step 2: Generate database query
            query_gen = QueryGenerator()
            data = query_gen.generate_query(analysis)
            
            # Convert queryset to list for processing
            if hasattr(data, '__iter__'):
                data_list = list(data)
            else:
                data_list = data
            
            logger.info(f"Query returned {len(data_list)} results")
            
            # If no data found, return helpful message
            if not data_list:
                result = {
                    'type': 'text',
                    'content': f"I couldn't find any data matching your query. Please try:\n- Checking if you have data in your database\n- Using different filters\n- Being more specific about what you're looking for"
                }
                ai_message = ChatMessage.objects.create(
                    conversation=conversation,
                    role='assistant',
                    content=str(result),
                    query_type=analysis.get('intent'),
                    response_format='text',
                    metadata=analysis
                )
                
                return Response({
                    'conversation_id': conversation.id,
                    'message_id': ai_message.id,
                    'result': result,
                    'analysis': analysis
                })
            
            # Step 3: Format response based on requested format
            formatter = ResponseFormatter()
            response_format = analysis.get('format', 'text')
            
            if response_format == 'table':
                result = formatter.format_table(data_list)
            elif response_format == 'chart':
                chart_type = analysis.get('chart_type', 'bar')
                result = formatter.format_chart(data_list, chart_type, analysis)
            elif response_format == 'excel':
                result = formatter.format_excel(data_list, 'fleet_report.xlsx')
            elif response_format == 'csv':
                result = formatter.format_csv(data_list, 'fleet_report.csv')
            elif response_format == 'pdf':
                result = formatter.format_pdf(data_list, 'fleet_report.pdf')
            else:
                # Generate natural language response
                natural_response = analyzer.generate_natural_response(data_list, user_query, analysis)
                result = formatter.format_text(data_list, natural_response)
            
            # Save AI response
            ai_message = ChatMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=str(result),
                query_type=analysis.get('intent'),
                response_format=response_format,
                metadata=analysis
            )
            
            return Response({
                'conversation_id': conversation.id,
                'message_id': ai_message.id,
                'result': result,
                'analysis': analysis
            })
            
        except Exception as e:
            logger.error(f"Error processing query: {e}", exc_info=True)
            return Response(
                {
                    'error': 'An error occurred processing your request',
                    'details': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_help_response(self):
        """Return help information"""
        return {
            'type': 'text',
            'content': '''👋 **Hello! I'm your AI Fleet Assistant**

I can help you with:

**🔍 Queries**
- "Show me all active vehicles"
- "List all drivers"
- "What vehicles need maintenance?"

**📊 Reports & Tables**
- "Generate a report of all vehicles"
- "Show me driver performance in a table"

**📈 Charts & Visualizations**
- "Create a bar chart of vehicle status"
- "Show me a pie chart of active vs inactive vehicles"

**📤 Export Data**
- "Export all vehicles to Excel"
- "Download driver list as CSV"
- "Generate PDF report of maintenance"

**💡 Tips:**
- Be specific about what you want to see
- Mention the format you prefer (table, chart, Excel, etc.)
- Use filters like "active", "last month", "maintenance due"

Try asking me something!'''
        }


class ChatHistoryView(APIView):
    """Get conversation history"""
    
    def get(self, request):
        conversations = ChatConversation.objects.filter(
            user=request.user
        ).prefetch_related('messages').order_by('-started_at')[:20]
        
        serializer = ChatConversationSerializer(conversations, many=True)
        return Response(serializer.data)


class ConversationDetailView(APIView):
    """Get specific conversation with messages"""
    
    def get(self, request, conversation_id):
        try:
            conversation = ChatConversation.objects.prefetch_related('messages').get(
                id=conversation_id,
                user=request.user
            )
            serializer = ChatConversationSerializer(conversation)
            return Response(serializer.data)
        except ChatConversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, conversation_id):
        """Delete a conversation"""
        try:
            conversation = ChatConversation.objects.get(
                id=conversation_id,
                user=request.user
            )
            conversation.delete()
            return Response({'message': 'Conversation deleted successfully'})
        except ChatConversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def patch(self, request, conversation_id):
        """Update conversation title"""
        try:
            conversation = ChatConversation.objects.get(
                id=conversation_id,
                user=request.user
            )
            title = request.data.get('title')
            if title:
                conversation.title = title
                conversation.save()
                return Response({'message': 'Conversation updated successfully', 'title': title})
            return Response({'error': 'Title is required'}, status=status.HTTP_400_BAD_REQUEST)
        except ChatConversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class DownloadFileView(APIView):
    """Download generated files (Excel, CSV, PDF)"""
    
    def get(self, request, message_id):
        try:
            message = ChatMessage.objects.get(
                id=message_id,
                conversation__user=request.user
            )
            
            # Parse the stored content
            import ast
            result = ast.literal_eval(message.content)
            
            if result.get('type') != 'file':
                return Response(
                    {'error': 'No file attached to this message'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Decode base64 data
            file_data = base64.b64decode(result['data'])
            file_format = result['format']
            filename = result['filename']
            
            # Set appropriate content type
            content_types = {
                'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'csv': 'text/csv',
                'pdf': 'application/pdf'
            }
            
            response = HttpResponse(
                file_data,
                content_type=content_types.get(file_format, 'application/octet-stream')
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except ChatMessage.DoesNotExist:
            return Response(
                {'error': 'Message not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error downloading file: {e}", exc_info=True)
            return Response(
                {'error': 'Error downloading file', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MessageDetailView(APIView):
    """Manage individual messages - Edit and Delete"""
    
    def patch(self, request, message_id):
        """Edit a message and regenerate response"""
        try:
            message = ChatMessage.objects.get(
                id=message_id,
                conversation__user=request.user,
                role='user'  # Only allow editing user messages
            )
            
            new_content = request.data.get('content')
            if not new_content or not new_content.strip():
                return Response(
                    {'error': 'Content is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update the message
            message.content = new_content
            message.save()
            
            # Delete subsequent messages (AI response and any follow-ups)
            ChatMessage.objects.filter(
                conversation=message.conversation,
                timestamp__gt=message.timestamp
            ).delete()
            
            return Response({
                'message': 'Message updated successfully',
                'content': new_content,
                'regenerate': True  # Signal frontend to regenerate response
            })
            
        except ChatMessage.DoesNotExist:
            return Response(
                {'error': 'Message not found or cannot be edited'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, message_id):
        """Delete a message and its response"""
        try:
            message = ChatMessage.objects.get(
                id=message_id,
                conversation__user=request.user
            )
            
            conversation = message.conversation
            timestamp = message.timestamp
            
            # Delete this message and all subsequent messages
            ChatMessage.objects.filter(
                conversation=conversation,
                timestamp__gte=timestamp
            ).delete()
            
            return Response({'message': 'Message deleted successfully'})
            
        except ChatMessage.DoesNotExist:
            return Response(
                {'error': 'Message not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class KnowledgeBaseView(APIView):
    """Manage knowledge base entries"""
    
    def get(self, request):
        """Get all knowledge base entries"""
        kb_entries = KnowledgeBase.objects.filter(is_active=True)
        
        # Optional: filter by category
        category = request.query_params.get('category')
        if category:
            kb_entries = kb_entries.filter(category=category)
        
        data = [{
            'category': entry.category,
            'question': entry.question,
            'answer': entry.answer,
            'keywords': entry.keywords
        } for entry in kb_entries]
        
        return Response(data)
