import json
import re
from groq import Groq
from django.conf import settings


class QueryAnalyzer:
    """Analyzes user queries using Groq AI to determine intent, entities, and format"""
    
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
    
    def analyze_query(self, user_query):
        """
        Analyze user query to determine:
        - Intent: (query/report/analysis/export/help)
        - Entities: (vehicles/drivers/trips/maintenance/etc)
        - Format: (text/table/chart/excel/csv/pdf)
        - Filters: (date ranges, vehicle IDs, status, etc)
        - Chart type: (bar/line/pie/none)
        """
        
        system_prompt = """You are a fleet management data analyst assistant. 
Analyze user queries and return structured JSON with the following format:
{
  "intent": "query|report|analysis|export|help",
  "entities": ["vehicles", "drivers", "maintenance", "trips", "compliance"],
  "format": "text|table|chart|excel|csv|pdf",
  "filters": {
    "status": "active|inactive|maintenance",
    "date_range": "today|week|month|year",
    "specific_dates": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
  },
  "chart_type": "bar|line|pie|none",
  "sql_hints": "additional context for query generation"
}

IMPORTANT RULES:
1. If the query mentions ANY entity (vehicles, drivers, maintenance, trips) → intent is "query" NOT "help"
2. Only use intent "help" if the user explicitly asks "what can you do", "help me", "how to use" AND mentions NO entities
3. Always default to "table" format for queries unless explicitly specified otherwise
4. For queries like "show me X", "list X", "get X" → always use intent "query" and format "table"

Examples:
- "Show me all active vehicles" → intent: query, entities: [vehicles], format: table, filters: {status: active}
- "List all drivers" → intent: query, entities: [drivers], format: table
- "Generate report of drivers" → intent: report, entities: [drivers], format: table
- "Create chart of maintenance costs" → intent: analysis, entities: [maintenance], format: chart, chart_type: bar
- "Export vehicles to Excel" → intent: export, entities: [vehicles], format: excel
- "Help" → intent: help, entities: [], format: text
"""
        
        try:
            completion = self.client.chat.completions.create(
                model="llama-3.1-70b-versatile",  # Fast and powerful Groq model
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Analyze this query: {user_query}"}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            response_text = completion.choices[0].message.content
            
            # Extract JSON from response (handle code blocks)
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                # Fallback if JSON parsing fails
                analysis = self._fallback_analysis(user_query)
            
            return analysis
            
        except Exception as e:
            print(f"Error analyzing query: {e}")
            return self._fallback_analysis(user_query)
    
    def _fallback_analysis(self, query):
        """Fallback analysis using simple keyword matching"""
        query_lower = query.lower()
        
        analysis = {
            "intent": "query",
            "entities": [],
            "format": "table",  # Default to table format for better data display
            "filters": {},
            "chart_type": "none",
            "sql_hints": ""
        }
        
        # Detect entities FIRST (most important)
        if 'vehicle' in query_lower or 'car' in query_lower or 'truck' in query_lower:
            analysis['entities'].append('vehicles')
        if 'driver' in query_lower:
            analysis['entities'].append('drivers')
        if 'maintenance' in query_lower or 'repair' in query_lower or 'service' in query_lower:
            # If asking about vehicles needing maintenance, add vehicles entity too
            if 'vehicle' in query_lower or 'need' in query_lower or 'require' in query_lower:
                if 'vehicles' not in analysis['entities']:
                    analysis['entities'].append('vehicles')
            analysis['entities'].append('maintenance')
        if 'trip' in query_lower or 'route' in query_lower or 'tracking' in query_lower or 'location' in query_lower:
            analysis['entities'].append('trips')
        
        # Detect intent AFTER entities (avoid false help detection)
        # Only detect help if explicitly asking for help AND no entities detected
        if len(analysis['entities']) == 0 and any(word in query_lower for word in ['help', 'hello', 'hi', 'what can you do', 'how to use']):
            analysis['intent'] = 'help'
        elif any(word in query_lower for word in ['export', 'download']):
            analysis['intent'] = 'export'
        elif any(word in query_lower for word in ['report', 'generate']):
            analysis['intent'] = 'report'
        elif any(word in query_lower for word in ['chart', 'graph', 'visualization', 'visualize']):
            analysis['intent'] = 'analysis'
        else:
            # If we have entities, it's a query
            if len(analysis['entities']) > 0:
                analysis['intent'] = 'query'
        
        # Detect format
        if 'excel' in query_lower or 'xls' in query_lower or 'xlsx' in query_lower:
            analysis['format'] = 'excel'
        elif 'csv' in query_lower:
            analysis['format'] = 'csv'
        elif 'pdf' in query_lower:
            analysis['format'] = 'pdf'
        elif 'chart' in query_lower or 'graph' in query_lower or 'visualize' in query_lower:
            analysis['format'] = 'chart'
        elif 'table' in query_lower or 'list' in query_lower or 'show' in query_lower:
            analysis['format'] = 'table'
        
        # Detect chart type
        if 'bar' in query_lower:
            analysis['chart_type'] = 'bar'
        elif 'line' in query_lower:
            analysis['chart_type'] = 'line'
        elif 'pie' in query_lower:
            analysis['chart_type'] = 'pie'
        
        # Detect filters
        if 'active' in query_lower and 'inactive' not in query_lower:
            analysis['filters']['status'] = 'active'
        elif 'inactive' in query_lower:
            analysis['filters']['status'] = 'inactive'
        elif ('maintenance' in query_lower or 'need' in query_lower or 'require' in query_lower) and 'status' not in analysis['filters']:
            # Queries like "need maintenance" or "require maintenance"
            analysis['filters']['status'] = 'maintenance'
            analysis['sql_hints'] = 'vehicles needing maintenance'
        
        # Detect date ranges
        if 'today' in query_lower:
            analysis['filters']['date_range'] = 'today'
        elif 'week' in query_lower or 'this week' in query_lower:
            analysis['filters']['date_range'] = 'week'
        elif 'month' in query_lower or 'this month' in query_lower:
            analysis['filters']['date_range'] = 'month'
        elif 'year' in query_lower or 'this year' in query_lower:
            analysis['filters']['date_range'] = 'year'
        
        return analysis
    
    def generate_natural_response(self, data, query, analysis):
        """Generate natural language response from data"""
        
        try:
            data_summary = f"Found {len(data)} results"
            if len(data) > 0 and hasattr(data[0], '__dict__'):
                sample = str(data[0].__dict__)[:200]
                data_summary += f". Sample: {sample}"
            
            completion = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",  # Faster model for responses
                messages=[
                    {"role": "system", "content": "You are a helpful fleet management assistant. Provide concise, informative responses."},
                    {"role": "user", "content": f"User asked: '{query}'\n\nData summary: {data_summary}\n\nProvide a natural language response."}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            return completion.choices[0].message.content
            
        except Exception as e:
            print(f"Error generating response: {e}")
            return f"I found {len(data)} results for your query."
