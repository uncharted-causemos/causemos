![logo](client/src/assets/causemos-logo-colour.svg)

# Causemos

Understand complex multi-domain issues by leveraging integrated knowledge, data, and models.

## Prerequisites

The following need to be installed

- NodeJS version 18
- Yarn 1.22+

## Auth Setup

### Setup external dependencies

Causemos requires multiple repos for development in addition to this one.

#### If developing within Uncharted

Local development and deployment instructions can be found inside the
[wm-playbooks/kubernetes](https://gitlab.uncharted.software/WM/wm-playbooks/-/tree/main/kubernetes) directory. Follow the steps outlined there to pull images generated by the World Modelers repositories.

Evironment information can be found in [wm-env](https://gitlab.uncharted.software/WM/wm-env).

#### If operating outside of Uncharted's environments

Run:

- [atlas](https://github.com/uncharted-causemos/atlas): ElasticSearch index mappings.
- [slow-tortoise](https://github.com/uncharted-causemos/slow-tortoise): Dojo to Causemos data pipeline, using Prefect and Dask.
- [wm-request-queue](https://github.com/uncharted-causemos/wm-request-queue): A queue of jobs to be passed to the data pipeline one at a time.
- [wm-go](https://github.com/uncharted-causemos/wm-go): For fetching the aggregated data produced by the pipeline.
- (Optional) [wm-docs](https://github.com/uncharted-causemos/wm-docs): User documentation.

See the "Environment" section below for information about where to record the endpoints for each service to run the stack locally.

## Running `causemos`

### Install dependencies

```
yarn install
```

### Environment

You need an environment configuration file to run the application. Copy `server/template.env` to `server/.env` and fill in the variables.

### (Optional) Debugging

The default development config includes some flags to facilitate debugging. To take advantage of these, install the Chrome Debugger Extension (https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome).

### Running locally

```
# Start client - Defaults to localhost:8080
yarn start-client

# start server - Defaults to localhost:3000
yarn start-server

# start server in debug mode
yarn start-server-debug
```

Navigate your browser to:

```
localhost:8078
```

This shows developer information (i.e. usernames and passwords for the 2 allowed user types -- `adam = admin` and `ursula = user`)
application runs.

The application runs at:

```
localhost:8078/app
```

### Additional options

Features that require communication with Dojo are disabled by default and must be turned on manually.
Note that these will impact Dojo's production environment. These should only be enabled for careful testing to avoid creating discrepancies between Dojo and Causemos environments

- `dojo-sync`: Send datacube metadata changes to Dojo
- `allow-model-runs`: Submit model runs for execution

```
# example: allow model execution, don't sync updates
yarn start-server --allow-model-runs
```
