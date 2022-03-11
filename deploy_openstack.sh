#!/usr/bin/env bash

################################################################################
# Build and deploys app onto internal openstack instance
#
# Note 1: This assumes the target VM has pm2 running
# Note 2: You need to have ssh access on the VM
################################################################################

rm -rf _causemos

### Openstack host
HOST="centos@10.65.18.69"


# Specify branches here if needed
branch="master"

if [ -n "${BRANCH}" ]; then
  branch=${BRANCH}
fi

RED='\033[0;31m'
B_YELLOW='\033[1;33m'
B_GREEN='\033[1;32m'
OFF='\033[0m' # No Color



echo "##########################################################"
echo -e "Deploying to ${B_GREEN}${HOST}${OFF}"
echo -e "Sourcing from client branch: ${B_GREEN}${branch}${OFF}"
if [[ "${PORT}" == "3000" || -z $PORT ]]; then
  echo -e "Deploying to port (This is the default demo instance) ${B_GREEN}3000${OFF}"
else
  echo -e "Deploying to port ${B_GREEN}${PORT}${OFF}"
fi
echo ""
echo -e "${B_YELLOW}Note: The script does not refresh environment files.${OFF}"
echo -e "${B_YELLOW}If needed you need to apply changes manually on the remote server ${HOST}${OFF}"
echo "##########################################################"
echo ""
read -r -p "Are you sure you want to continue? [y/N] " response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])+$ ]]
then
  echo "Starting deployment ..."
else
  exit 1
fi

git clone -b ${branch} git@gitlab.uncharted.software:WM/causemos.git _causemos
if [ $? -eq 0 ]; then
    echo "Cloned causemos"
else
    echo "Failed to clone causmos"
    exit 1
fi

CURRENT_DIR=$PWD
CAUSEMOS=./_causemos


# Get last commit
COMMIT=`cd ${CURRENT_DIR}/${CAUSEMOS} && git rev-parse HEAD`

### Setup client
echo "Setting up dependencies... this may take a few minutes"
cd ${CURRENT_DIR}/${CAUSEMOS} && yarn workspace client install
if [ $? -eq 0 ]; then
    echo "Client dependencies install OK"
else
    echo "Client dependencies install failed"
    exit 1
fi

### Run unit tests
echo "Running test suites...this may take a few minutes"
cd ${CURRENT_DIR}/${CAUSEMOS} && yarn workspace client run test:unit
if [ $? -eq 0 ]; then
    echo "Client tests OK"
else
    echo "Client tests failed"
    exit 1
fi

### Build client
echo "Buildin client...this may take a few minutes"
cd ${CURRENT_DIR}/${CAUSEMOS} && yarn workspace client run build
if [ $? -eq 0 ]; then
    echo "Client build OK"
else
    echo "Client build failed"
    exit 1
fi


#### Package everything together
echo "Packaging..."
cd ${CURRENT_DIR}
rm -rf _temp
mkdir -p _temp/src
cp -r ${CAUSEMOS}/server/src/ _temp/src/
cp ${CAUSEMOS}/server/package.json _temp/
cp ${CAUSEMOS}/server/package-lock.json _temp/
cp -r ${CAUSEMOS}/client/dist _temp/public


### Stop PM2 instance
echo "Stopping remote instance"
ssh ${HOST} "pm2 stop www${PORT}"
ssh ${HOST} "pm2 delete www${PORT}"


### Remove previous install
echo "Removing remote causemos${PORT}"
ssh ${HOST} "rm -rf causemos${PORT}"


### Copy to remote
echo ""
echo "Copying server files to remote ${HOST}"
scp -r _temp ${HOST}:causemos${PORT}
if [ $? -eq 0 ]; then
    echo "Copy to remote seems fine"
else
    echo "Copy to remote failed"
    exit 1
fi

echo ""
echo "Get server dependencies"
ssh ${HOST} "cd causemos${PORT} && npm install"

echo "Start"
if [ -z "$PORT" ]
then
  ssh ${HOST} "pm2 start causemos${PORT}/src/bin/www"
else
  ssh ${HOST} "PORT=${PORT} pm2 start causemos${PORT}/src/bin/www --name www${PORT}"
fi

echo "Log deploy time"
ssh ${HOST} bash -s <<EOF
  echo "$USER `date` ${PORT} ${branch} ($COMMIT)" >>  deploy.log
EOF
