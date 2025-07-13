{
  "ImageId": "ami-0abc123d45e6f7890",
  "InstanceType": "t3.micro",
  "KeyName": "my-ssh-key",
  "SecurityGroupIds": ["sg-0abc123def4567890"],
  "BlockDeviceMappings": [
    { "DeviceName": "/dev/xvda",
      "Ebs": { "VolumeSize": 16, "VolumeType": "gp3" } }
  ],
  "TagSpecifications": [
    { "ResourceType": "instance",
      "Tags": [ { "Key": "Name", "Value": "fastapi-313" } ] }
  ],
  "UserData": "${USERDATA_B64}"
}
