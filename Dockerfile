# docker build -t docker.uncharted.software/worldmodeler/wm-server:latest .

FROM mhart/alpine-node:12
ENV LOG_LEVEL="warn"

ADD ./server/src /wm-server/src
ADD ./server/public /wm-server/public
ADD ./server/docker_scripts /wm-server/docker_scripts
ADD ./server/package.json /wm-server/package.json
ADD ./server/package-lock.json /wm-server/package-lock.json

WORKDIR /wm-server

# When running as root, npm won't run any scripts by default. --unsafe-perm let npm to run the scripts
#
# `If npm was invoked with root privileges, then it will change the uid to the user account or uid specified by the user config, which defaults to nobody. Set the unsafe-perm flag to run scripts with root privileges.`
# Ref: https://docs.npmjs.com/misc/scripts#user
RUN npm install --unsafe-perm

HEALTHCHECK --interval=20s --timeout=2s --start-period=60s \
CMD node ./docker_scripts/health_check.js

CMD npm start -- --log-level info
