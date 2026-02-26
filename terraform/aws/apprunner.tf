resource "aws_apprunner_vpc_connector" "app" {
  vpc_connector_name = "${var.service_name}-vpc-connector"
  subnets            = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  security_groups    = [aws_security_group.rds.id]
}

resource "aws_apprunner_service" "app" {
  service_name = var.service_name

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.app.repository_url}:latest"
      image_repository_type = "ECR"

      image_configuration {
        port = "8080"

        runtime_environment_variables = {
          NODE_ENV = "production"
          HOSTNAME = "0.0.0.0"
        }

        # All 12 app secrets injected from Secrets Manager
        runtime_environment_secrets = {
          for name in local.secret_names :
          name => aws_secretsmanager_secret.app[name].arn
        }
      }
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu               = "1 vCPU"
    memory            = "2 GB"
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.app.arn

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.app.arn
    }
  }

  tags = { Name = var.service_name }

  depends_on = [
    aws_secretsmanager_secret.app,
    aws_iam_role.apprunner_instance,
    aws_iam_role.apprunner_access,
  ]
}

resource "aws_apprunner_auto_scaling_configuration_version" "app" {
  auto_scaling_configuration_name = "${var.service_name}-scaling"
  min_size                        = 1
  max_size                        = 5
  max_concurrency                 = 100
}
