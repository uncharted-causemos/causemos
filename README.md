![logo](client/src/assets/causemos-logo-colour.svg)


## Causemos
World Modelers application for exploring and building models!!

### Prerequisite
The following need to be installed
- NodeJS version 12
- Yarn 1.22+


### Install dependencies
Note by default the application depends on an Uncharted theme library based on Bootstrap. You need to have access to the Uncharted npm registry to download the library.
```
# Set registry
npm config set @uncharted:registry http://npm.uncharted.software

# Log in with uncharted credentials
npm login --registry=https://npm.uncharted.software --scope=@uncharted
```

If you want to use vanilla Bootstrap, make the following changes - note some colors and themes may need to be adjusted if you go with this route.
```
# Pull in dependencies
yarn workspace client add bootstrap-sass@3.4.1
yarn worksapce client remove @uncharted/uncharted-bootstrap

# In client/src/app.vue, replace "Uncharted Bootstrap section with"
$icon-font-path: "~bootstrap-sass/assets/fonts/bootstrap/";
@import '~bootstrap-sass/assets/stylesheets/_bootstrap.scss';

# In client/src/styles/custom.scss
Remove the unchartd-bootstrap import
```

When all set, install the rest of the dependencies
```
yarn install
```


### Environment
You need an  environment configuration file to run the application. Copy `server/template.env` to `server/.env` and fill in the variables.

If running against Uncharted internal openstack, you can find a working environment file here: https://gitlab.uncharted.software/WM/wm-env/-/tree/master/dev

### Debugging
The default development config includes some flags to facilitate debugging. Interested users would need to install the Chrome Debugger Extension (https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome) if it is not already installed!

### Additional dependencies
Causemos internally depends on two additional services: a data/tile service for doing data-intensive work, and a recommendation service to aid curations. These services are specified in the environment file, if you want to run these locally please follow the instructions at their respective repos.
- wm-go: https://gitlab.uncharted.software/WM/wm-go
- wm-curation-recommendation: https://gitlab.uncharted.software/WM/wm-curation-recommendation


### Running locally
```
# Start client - Defaults to localhost:8080
yarn start-client

# start server - Defaults to localhost:3000
yarn start-server
```


### Build
Bulding and packaging the code.


#### Build: Internal testing on Openstack
Deploy to internal Openstack for testing. Note you need to have your public-key added to the target machine.

```
# Default
./deploy_openstack.sh

# Use specific branch and port
PORT=4002 BRANCH="fix-123" ./deploy_openstack.sh
```

#### Build: Docker
You can build the docker image with the following steps. Here we assume you want to build a "local" version
```
# Build and pack client
yarn workspace client run build

# Install to server
cp -r client/dist server/public

# Build server
docker build -t docker.uncharted.software/worldmodeler/wm-server:local .
```

You can test docker images by
```
docker run -p 3000:3000 --env-file <envfile> -t docker.uncharted.software/worldmodeler/wm-server:<version>
```

Note docker interprets envfiles differently, the variables cannot be quoted!! So it is A=123 and not A="123"


### Release and Deployment
#### Release new docker image (In Progress !!!)
Docker images can be release to Uncharted registry at http://10.65.4.8:8081/#browse/welcome

To push to the registry, make sure you have logged in
```
docker login -u <confluence-username> --password <confluence-password> https://docker.uncharted.software
```

#### Release new configuration
For configuration and stack changes, for example adding new variables to the envfile or adding a new sevice, the following procedures apply.

We keep the "prod" docker-compose file in a separate repo: https://gitlab.uncharted.software/WM/wm-playbooks/-/tree/master/causemos

We keep the "prod" environment files in a separate repo: https://gitlab.uncharted.software/WM/wm-env

Once you have changed these files, contact `cloud-ops` to ask them to redeploy these configurations.



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
