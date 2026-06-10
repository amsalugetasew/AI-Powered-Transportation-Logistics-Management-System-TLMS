# Migration to add license fields to Driver model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fleet', '0005_compliance_features'),
    ]

    operations = [
        migrations.AddField(
            model_name='driver',
            name='license_issue_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='driver',
            name='issuing_authority',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='driver',
            name='license_notes',
            field=models.TextField(blank=True),
        ),
    ]
