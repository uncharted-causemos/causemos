-- Create keycloak DB
CREATE USER keycloak;
ALTER USER keycloak WITH PASSWORD 'keycloak';
CREATE DATABASE keycloak;
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
ALTER DATABASE keycloak OWNER TO keycloak;

-- create Causemos DB
CREATE DATABASE causemos;
