from django.db import models

class OrganizationLevel(models.Model):
    LEVEL_CHOICES = (
        (1, 'Central'),
        (2, 'Division'),
        (3, 'Department'),
        (4, 'Branch'),
        (5, 'Unit'),
        (6, 'Section'),
        (7, 'Team'),
    )
    
    name = models.CharField(max_length=100)
    level_type = models.IntegerField(choices=LEVEL_CHOICES)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'org_levels'
        ordering = ['level_type', 'name']

    def __str__(self):
        return f"{self.get_level_type_display()} - {self.name}"
