import pg from "pg";
import { databaseUrl } from "./env";

// Drops and recreates the development database. Refuses anything that isn't local.
const url = new URL(databaseUrl());
if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error(`Refusing to reset ${url.hostname}: only a local database can be reset.`);
const name = url.pathname.slice(1);
const admin = new URL(url);
admin.pathname = "/postgres";
const client = new pg.Client({ connectionString: admin.toString() });
await client.connect();
await client.query(`drop database if exists "${name}" with (force)`);
await client.query(`create database "${name}"`);
await client.end();
console.log(`Recreated ${name}. Run db:migrate and db:seed next.`);
