#!/usr/bin/env node

import { spawnSync } from "child_process";
import replace from "replace-in-file";
import { promisify } from "util";
import readline from "readline";
import { Stream } from "stream";
import path from "path";
import tar from "tar";
import got from "got";
import fs from "fs";

const pipeline = promisify(Stream.pipeline);

const help = process.argv.includes("-h") || process.argv.includes("--help");

if (help) {
	console.log("Create React Native New Architecture Files 🎉\n");
	console.log("This script creates necessary files for new architecture");
	console.log("You still have to apply additional diff");
	console.log("Usage: npx create-react-native-new-architecture-files\n");
	console.log("Command options:");
	console.log("-h, --help         Print usage info.");
	process.exit(0);
}

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

let appName, packageName;

if (isGitDirty()) {
	console.error("Your git working tree is dirty.");
	console.error("Please commit or stash your changes and re-run the script.");
	process.exit(1);
} else {
	startSetup();
}

function startSetup() {
	const appJSON = JSON.parse(fs.readFileSync(process.cwd() + "/app.json"));
	const packageJSON = JSON.parse(
		fs.readFileSync(process.cwd() + "/package.json")
	);

	const defaultAppName =
		appJSON?.name || appJSON?.expo?.name || packageJSON.name || "MyApp";

	const defaultPackageName = `com.${defaultAppName.toLowerCase()}`;

	appName = defaultAppName;
	packageName = defaultPackageName;

	rl.question(
		`App package name? [${defaultPackageName}] `,
		function (userPackageName) {
			packageName = userPackageName || defaultPackageName;

			rl.close();
		}
	);
	rl.on("close", createFiles);
}

function createFiles() {
	downloadAndExtractFiles();

	replace.sync({
		files: [`${process.cwd()}/android/app/src/main/**`],
		from: [/com.rndiffapp/g, /rndiffapp/g, /RnDiffApp/g],
		to: packageName,
	});

	replace.sync({
		files: [`${process.cwd()}/android/app/src/main/**`],
		from: [/rndiffapp/g, /RnDiffApp/g],
		to: appName,
	});
}

function downloadAndExtractFiles() {
	const jniRoot = `${process.cwd()}/android/app/src/main/`;
	const newArchRoot = `${process.cwd()}/android/app/src/main/java/com/${appName}/`;

	copyFolderRecursiveSync(
		"/home/ahmetb/react_n/create-rn-new-architecture-files/files/jni/",
		jniRoot
	);

	copyFolderRecursiveSync(
		"/home/ahmetb/react_n/create-rn-new-architecture-files/files/newarchitecture/",
		newArchRoot
	);
}

function copyFolderRecursiveSync(source, target) {
	var files = [];

	// Check if folder needs to be created or integrated
	var targetFolder = path.join(target, path.basename(source));
	if (!fs.existsSync(targetFolder)) {
		fs.mkdirSync(targetFolder);
	}

	// Copy
	if (fs.lstatSync(source).isDirectory()) {
		files = fs.readdirSync(source);
		files.forEach(function (file) {
			var curSource = path.join(source, file);
			if (fs.lstatSync(curSource).isDirectory()) {
				copyFolderRecursiveSync(curSource, targetFolder);
			} else {
				copyFileSync(curSource, targetFolder);
			}
		});
	}
}

function copyFileSync(source, target) {
	var targetFile = target;

	// If target is a directory, a new file with the same name will be created
	if (fs.existsSync(target)) {
		if (fs.lstatSync(target).isDirectory()) {
			targetFile = path.join(target, path.basename(source));
		}
	}

	fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function isGitDirty() {
	const output = spawnSync("git", ["status", "--porcelain"]);
	if (output.status === 0) {
		return output.stdout.toString().trim().length > 0;
	}
}
