from rest_framework import serializers
from .models import User
from hierarchy.models import OrganizationLevel

class OrganizationLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationLevel
        fields = ['id', 'name', 'level_type', 'parent']

class UserSerializer(serializers.ModelSerializer):
    organization = OrganizationLevelSerializer(read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=OrganizationLevel.objects.all(),
        source='organization',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'organization', 'organization_id']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name', 'role']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'VIEWER')
        )
        return user
