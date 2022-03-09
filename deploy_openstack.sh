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


echo "##########################################################"
echo "Sourcing from client branch: ${branch}"
if [[ "${PORT}" == "3000" || -z $PORT ]]; then
  echo "Deploying to port 3000 (This is the default demo instance)"
else
  echo "Deploying to port ${PORT}"
fi
echo "##########################################################"
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


#### Pack: FIXME: Clean up
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

# echo "Copy credentials"
# ssh ${HOST} "cp .env causemos${PORT}/"

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
