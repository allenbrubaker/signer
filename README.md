# Challenge

Implement a record signing service using a message driven / microservice solution.

Given a database of 100,000 records and a collection of 100 private keys, create a process to concurrently sign batches of records, storing the signatures in the database until all records are signed.

## Rules

- No double signing: Only a signature per record should be stored (sign each record individually in batches of X size)
- Any given key in the keyring must not be used concurrently
- A single key should be used for signing all records in a single batch
- Keys should be selected from least recently used to most recently
- Batch size should be configurable by the user (does not change during runtime)

## Guidelines

- Use a runtime environment of your choosing (we predominantly use Golang and Typescript but language knowledge assessment is not the aim of this challenge)
- Use any orchestration or process coordination tools you see fit (message queues, lambdas, etc)
- Seed the records with any random data
- Use a public key crypto algorithm of your choosing

# Solution Architecture

![Signer Architecture](https://user-images.githubusercontent.com/7928072/231052815-2ff6b092-ce0c-4911-836b-8be4b0024eff.png)


# Setup / Execution

## Installation

- install and run docker desktop
- nvm use
- npm i -g yarn
- yarn install

## Execution

- yarn deploy
- yarn lambda:startup
  - *wait until 100k messages are seeded before proceeding*
- yarn lambda:sign

## Inspect Database

- http://localhost:8001/
