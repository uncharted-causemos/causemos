# WM-Server
Provides storage and lookup services to WM-Client application

### Install dependencies
package | versions
--- | ---
node | 12.10.0
npm | 6.11.3

```
### Install sever dependencies
npm install

### Create a file for storing environment variables
Navigate to the root directory of the project in terminal.
Type 'cp .env.template .env' into the terminal to create a .env file.
Enter the proper application credentials into the .env file (replacing xxx... entries).
```

Latest `.env` credentials:

https://confluence.uncharted.software/display/WM/Configurations


### Running
```
### Running with default configuraitons
npm run start

### Running debug mode with more verbose output
npm run debug
```

### Run tests
```
npm test
```

### Start with custom configuration
The majority of the configurations and credentials are specified as environment variables, the application reads `.env`.

The following flags/options are available as run arguments. You need to run `bin/www` manually.

- `--log-level`: server logging level, default to info
- `--cache-size`: LRU cache size

```
# For example, to start with warn log-level
node ./src/bin/www --log-level warn

```

### Import data to ES

Refer to https://gitlab.uncharted.software/WM/wm-iaas

# Deploy demo

### Openstack deployment
A bash script is currently used to do demo deployment, you will need to have your public key added to authorized_keys on the Openstack VM. The script will:
- Stop existing demo instance on Openstack
- Pull *wm-server* and *wm-client* projects
- Test and build *wm-client*
- Package *wm-client* build into *wm-server*
- Copy *wm-server* to Openstack and install dependencies
- Restart the demo instance on Openstack

Note the demo instance is governed via the PM2 process manager.

### Run deployment
```
./deploy.sh
```

### Run deployment with different ports (for experimentation)
```
env PORT=<specific port to deploy> ./deploy.sh
```

# Docker scripts
### To build a docker image for:
```
### authentication (wm-nginx)
docker build -t docker.uncharted.software/worldmodeler/wm-nginx .

### server (wm-server)
./build.sh <target> <version>
```

### Run public demo container locally

```
### To start
docker-compose -f docker-compose-dev.yml up -d

### Check status/info
docker ps

### To end
docker-compose down
```

### Run public demo container in "swarm mode"

```
### To start
docker swarm init
docker stack deploy --compose-file docker-compose-dev.yml world_modeler

### Check status/info
docker ps
'OR'
docker stack ps world_modeler

### To end
docker stack rm world_modeler
```

### Publish docker swarm
#### Docker login
```
docker login -u <confluence-username> --password <confluence-password> https://docker.uncharted.software
```
FYI: everyone who works for Uncharted and has the ability to log into and read this Confluence document has permissions to push to our Docker registry. -Mar2019

#### Authentication (wm-nginx)
```
docker push docker.uncharted.software/worldmodeler/wm-nginx:latest
```
#### Server (wm-server)
```
docker push docker.uncharted.software/worldmodeler/wm-server:latest
```
#### Update `docker-compose.yml`
1. Update the `docker-compose.yml`

  Note: Should reflect the same change to `docker-compose-dev.yml` when necessary to test on local swarm

2. Run `git diff docker-compose.yml > docker-compose.diff` to create the diff file
3. Send the diff file to the OPS team to update the the docker configuration

