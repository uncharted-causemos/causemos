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

### Environment
You need an  environment configuration file to run the application. Copy `server/template.env` to `server/.env` and fill in the variables.

If running against Uncharted internal openstack, you can find a working environment file here: https://gitlab.uncharted.software/WM/wm-env/-/tree/master/dev


### Running 
```
# Start client - Defaults to localhost:8080
yarn start-client

# start server - Defaults to localhost:3000
yarn start-server
```


### Build: Internal testing
Deploy to internal Openstack for testing. Note you need to have your public-key added to the target machine.

```
# Default
./deploy_openstack.sh

# Use specific branch and port
PORT=4002 BRANCH="fix-123" ./deploy_openstack.sh
```

### Build: Docker
You can build a stand-alone image locally with the following steps. Here we assume you want to build a "local" version

```
# Build and pack client
yarn workspace client run build

# Install to server
cp -r client/dist server/public

# Build server
docker build -t docker.uncharted.software/worldmodeler/wm-server:local .

# Run image
docker run -p 3000:3000 --env-file <envfile> -t docker.uncharted.software/worldmodeler/wm-server:local
```

Note docker interprets envfiles differently, the variables cannot be quoted!! So it is A=123 and not A="123"


### Swarm Testng (In Progress !!!)
```
# Start
docker swarm init
docker stack deploy --compose-file docker-compose-dev.yml world_modeler

### Check status/info
docker ps
'OR'
docker stack ps world_modeler

### To end
docker stack rm world_modeler
```


### Swarm Deployment (TODO)
For deployment to docker-swarm (external) the procedure is similar but uses different sets of scripts to ensure no side-effects from local changes, it will also tag and version the git repository.
Please see: https://gitlab.uncharted.software/WM/wm-playbooks/-/tree/master/causemos

For configuration and environment changes, the config and compose files are kept in a separate repository along with other WM artifacts.
Please see: https://gitlab.uncharted.software/WM/wm-env

### Release (TODO)
Make sure you can login into Uncharted registry
```
docker login -u <confluence-username> --password <confluence-password> https://docker.uncharted.software
```

