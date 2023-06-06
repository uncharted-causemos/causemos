# docker build -t docker.uncharted.software/worldmodeler/wm-server:latest .

# In order to keep the final image size small, we use docker multi-stage buids. clientBuilder builds
# client dist files and only those files are copied over to the final image. It helps keeping the image size small
# by excluding all the client side node modules installed for building the client.
FROM  docker-hub.uncharted.software/node:18-alpine AS clientBuilder
# Install git which is required by node-gyp which is one of the node-saas dependencies
RUN apk update && apk upgrade && apk add git
ADD ./yarn.lock /client/yarn.lock
ADD ./client/package.json /client/package.json
WORKDIR /client
# In order to build the client, we need dev dependencies, so yarn install without the --prod flag
RUN yarn install --network-timeout 600000
# Add client files
ADD ./client /client
# Build client (Give node.js process enough memory since the default memory limit doesn't seem to be enough to run vite build)
RUN NODE_OPTIONS=--max_old_space_size=4096 yarn run build

FROM  docker-hub.uncharted.software/node:18-alpine
RUN apk update && apk upgrade
ADD ./yarn.lock /server/yarn.lock
ADD ./server/package.json /server/package.json
WORKDIR /server
RUN yarn install --prod --network-timeout 600000
# Copy client files
COPY --from=clientBuilder /client/dist /server/public/app
# Add server files
ADD ./server /server

CMD yarn run start --log-level info --schedules dart,aligner --dojo-sync --allow-model-runs
