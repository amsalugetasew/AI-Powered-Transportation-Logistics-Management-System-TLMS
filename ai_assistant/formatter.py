import pandas as pd
from io import BytesIO
import base64
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
import seaborn as sns
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from datetime import datetime


class ResponseFormatter:
    """Format query results into various output formats"""
    
    def format_text(self, data, natural_response):
        """Generate text response"""
        return {
            'type': 'text',
            'content': natural_response
        }
    
    def format_table(self, data):
        """Convert queryset/data to table format"""
        if not data:
            return {
                'type': 'table',
                'columns': [],
                'rows': [],
                'count': 0
            }
        
        # Data is already a list of dicts from query_generator
        data_list = data if isinstance(data, list) else list(data)
        
        if not data_list:
            return {'type': 'table', 'columns': [], 'rows': [], 'count': 0}
        
        # Get columns from first item
        columns = list(data_list[0].keys())
        
        # Clean and format data
        rows = []
        for item in data_list:
            row = {}
            for col in columns:
                value = item.get(col)
                # Format dates
                if isinstance(value, (datetime)):
                    row[col] = value.strftime('%Y-%m-%d %H:%M')
                elif value is None:
                    row[col] = '-'
                else:
                    row[col] = str(value)
            rows.append(row)
        
        return {
            'type': 'table',
            'columns': columns,
            'rows': rows,
            'count': len(rows)
        }
    
    def format_chart(self, data, chart_type='bar', analysis=None):
        """Generate chart image as base64"""
        if not data:
            return {'type': 'text', 'content': 'No data available for chart'}
        
        try:
            # Data is already a list of dicts
            df = pd.DataFrame(data if isinstance(data, list) else list(data))
            
            if df.empty:
                return {'type': 'text', 'content': 'No data available for chart'}
            
            # Create figure
            plt.figure(figsize=(10, 6))
            plt.style.use('seaborn-v0_8-darkgrid')
            
            # Determine what to plot
            if 'status' in df.columns:
                self._plot_status_chart(df, chart_type)
            elif 'count' in df.columns:
                self._plot_count_chart(df, chart_type)
            else:
                # Default: plot first numeric column
                numeric_cols = df.select_dtypes(include=['number']).columns
                if len(numeric_cols) > 0:
                    df[numeric_cols[0]].plot(kind=chart_type)
                else:
                    return {'type': 'text', 'content': 'No numeric data available for chart'}
            
            plt.tight_layout()
            
            # Convert to base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.read()).decode()
            plt.close()
            
            return {
                'type': 'chart',
                'chart_type': chart_type,
                'image': f"data:image/png;base64,{image_base64}"
            }
            
        except Exception as e:
            print(f"Error generating chart: {e}")
            return {'type': 'text', 'content': f'Error generating chart: {str(e)}'}
    
    def _plot_status_chart(self, df, chart_type):
        """Plot status distribution"""
        status_counts = df['status'].value_counts()
        
        if chart_type == 'pie':
            plt.pie(status_counts.values, labels=status_counts.index, autopct='%1.1f%%')
            plt.title('Status Distribution')
        elif chart_type == 'bar':
            status_counts.plot(kind='bar', color='steelblue')
            plt.title('Status Distribution')
            plt.xlabel('Status')
            plt.ylabel('Count')
            plt.xticks(rotation=45)
    
    def _plot_count_chart(self, df, chart_type):
        """Plot count data"""
        if chart_type == 'pie':
            plt.pie(df['count'], labels=df.iloc[:, 0], autopct='%1.1f%%')
        else:
            df.plot(x=df.columns[0], y='count', kind=chart_type, legend=False)
            plt.xticks(rotation=45)
    
    def format_excel(self, data, filename='report.xlsx'):
        """Generate Excel file"""
        if not data:
            return {'type': 'text', 'content': 'No data available for export'}
        
        try:
            # Data is already a list of dicts
            df = pd.DataFrame(data if isinstance(data, list) else list(data))
            
            # Create Excel file in memory
            buffer = BytesIO()
            with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Data')
                
                # Auto-adjust column width
                worksheet = writer.sheets['Data']
                for idx, col in enumerate(df.columns):
                    max_length = max(df[col].astype(str).apply(len).max(), len(col))
                    worksheet.column_dimensions[chr(65 + idx)].width = min(max_length + 2, 50)
            
            buffer.seek(0)
            
            return {
                'type': 'file',
                'format': 'excel',
                'filename': filename,
                'data': base64.b64encode(buffer.getvalue()).decode(),
                'size': len(buffer.getvalue())
            }
            
        except Exception as e:
            print(f"Error generating Excel: {e}")
            return {'type': 'text', 'content': f'Error generating Excel: {str(e)}'}
    
    def format_csv(self, data, filename='report.csv'):
        """Generate CSV file"""
        if not data:
            return {'type': 'text', 'content': 'No data available for export'}
        
        try:
            # Data is already a list of dicts
            df = pd.DataFrame(data if isinstance(data, list) else list(data))
            
            # Convert to CSV
            csv_data = df.to_csv(index=False)
            
            return {
                'type': 'file',
                'format': 'csv',
                'filename': filename,
                'data': base64.b64encode(csv_data.encode()).decode(),
                'size': len(csv_data)
            }
            
        except Exception as e:
            print(f"Error generating CSV: {e}")
            return {'type': 'text', 'content': f'Error generating CSV: {str(e)}'}
    
    def format_pdf(self, data, filename='report.pdf', title='Fleet Management Report'):
        """Generate PDF report"""
        if not data:
            return {'type': 'text', 'content': 'No data available for export'}
        
        try:
            # Data is already a list of dicts
            df = pd.DataFrame(data if isinstance(data, list) else list(data))
            
            # Create PDF
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            elements = []
            styles = getSampleStyleSheet()
            
            # Add title
            elements.append(Paragraph(title, styles['Title']))
            elements.append(Spacer(1, 0.3*inch))
            
            # Add timestamp
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            elements.append(Paragraph(f"Generated: {timestamp}", styles['Normal']))
            elements.append(Spacer(1, 0.2*inch))
            
            # Convert DataFrame to table data
            table_data = [df.columns.tolist()] + df.values.tolist()
            
            # Limit columns for better PDF formatting
            if len(df.columns) > 6:
                table_data = [[str(cell)[:20] for cell in row] for row in table_data]
            
            # Create table
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(table)
            
            # Build PDF
            doc.build(elements)
            buffer.seek(0)
            
            return {
                'type': 'file',
                'format': 'pdf',
                'filename': filename,
                'data': base64.b64encode(buffer.getvalue()).decode(),
                'size': len(buffer.getvalue())
            }
            
        except Exception as e:
            print(f"Error generating PDF: {e}")
            return {'type': 'text', 'content': f'Error generating PDF: {str(e)}'}
    
    def _model_to_dict(self, obj):
        """Convert Django model instance to dict"""
        if hasattr(obj, '__dict__'):
            data = {}
            for key, value in obj.__dict__.items():
                if not key.startswith('_'):
                    if isinstance(value, datetime):
                        data[key] = value.strftime('%Y-%m-%d %H:%M')
                    else:
                        data[key] = value
            return data
        return {}
