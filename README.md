# illumos-fmaweb: Illumos Fault Management Architecture (FMA) Message Registry

## Overview

The [Illumos](http://www.illumos.org) Fault Management Architecture (FMA)
subsystem uses checksummed message codes and URLs to identify particular fault
conditions.  Users are directed to a standard URL where they may look up
messages for more detailed fault information.  This web application serves
those messages to users.

## Installation and Deployment

This application is built to be deployed by cloning the github repository.  The
application (including various technical and branding functionality) is
configured through the environment.  At present, these settings are documented
and supported:

  * `HTTP_LISTEN_PORT` -- the port to bind to when listening for HTTP
    requests.

  * `FMA_DISTRO` -- for branding; substituted wherever %DISTRO% appears in the
    `msg/` content.  Defaults to "Illumos".

  * `FMA_URL` -- for branding; substituted wherever %FMAURL% appears in the
    `msg/` content.  Defaults to "http://illumos.org/msg".

To run the webapp, check out the repository, install the dependencies,
configure your environment and start the application:

    git clone https://github.com/jclulow/illumos-fmaweb-wip.git &&
    cd illumos-fmaweb-wip &&
    npm install -d &&
    HTTP_LISTEN_PORT=8080 node app.js
