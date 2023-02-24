variable "DOCKER_REGISTRY" {
  default = "docker.uncharted.software"
}
variable "DOCKER_ORG" {
  default = "worldmodeler"
}
variable "VERSION" {
  default = "local"
}

# ---------------------------------
function "tag" {
  params = [image_name, prefix, suffix]
  result = [ "${DOCKER_REGISTRY}/${DOCKER_ORG}/${image_name}:${check_prefix(prefix)}${VERSION}${check_suffix(suffix)}" ]
}

function "check_prefix" {
  params = [tag]
  result = notequal("",tag) ? "${tag}-": ""
}

function "check_suffix" {
  params = [tag]
  result = notequal("",tag) ? "-${tag}": ""
}

# ---------------------------------
group "prod" {
  targets = ["causemos"]
}

group "default" {
  targets = ["causemos-base"]
}

# ---------------------------------
target "_platforms" {
  platforms = ["linux/amd64", "linux/arm64"]
}

target "causemos-base" {
	context = "."
	tags = tag("causemos", "", "")
	dockerfile = "Dockerfile"
}

target "causemos" {
  inherits = ["_platforms", "causemos-base"]
}
