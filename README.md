## Causemos
World Modelers application for exploring and building models!!

### Prerequisite
The following need to be installed
- NodeJS version 12
- Yarn 1.22+


### Install dependencies
```
yarn install
```

#### Note
Some package require additional permissions. You need added into uncharted github group.

```
# Set registry
npm config set @uncharted:registry http://npm.uncharted.software

# Log in with uncharted credentials
npm login --registry=https://npm.uncharted.software --scope=@uncharted
```


### Running 
```
# Start client - Defaults to localhost:8080
yarn start-client

# start server - Defaults to localhost:3000
yarn start-server
```


### Build
Deploy to internal Openstack for testing. Note you need to have your public-key added to the target machine.

```
# Default
./deploy_openstack.sh

# Use specific branch and port
PORT=4002 BRANCH="fix-123" ./deploy_openstack.sh
```
