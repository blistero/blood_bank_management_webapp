from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("donors", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="donorprofile",
            name="blood_group",
            field=models.CharField(
                blank=True,
                choices=[
                    ("A+", "A+"), ("A-", "A-"), ("B+", "B+"), ("B-", "B-"),
                    ("AB+", "AB+"), ("AB-", "AB-"), ("O+", "O+"), ("O-", "O-"),
                ],
                max_length=3,
            ),
        ),
        migrations.AlterField(
            model_name="donorprofile",
            name="date_of_birth",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="donorprofile",
            name="gender",
            field=models.CharField(
                blank=True,
                choices=[("M", "Male"), ("F", "Female"), ("O", "Other")],
                max_length=1,
            ),
        ),
        migrations.AlterField(
            model_name="donorprofile",
            name="phone",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name="donorprofile",
            name="city",
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
