#!/usr/bin/env node

import { spawnSync } from "child_process";
import replace from "replace-in-file";
import readline from "readline";
import tar from "tar";
import got from "got";
import fs from "fs";

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
	const packageJSONPath = process.cwd() + "/package.json";
	const packageJsonExists = fs.existsSync(packageJSONPath);

	if (!packageJsonExists) {
		console.error(
			"Couldn't find package.json. Are you sure you are in the right directory?"
		);
		process.exit(1);
	}

	const { name } = JSON.parse(fs.readFileSync(packageJSONPath));

	const defaultPackageName = `com.${name.toLowerCase()}`;

	rl.question(
		`Package name? [${defaultPackageName}] `,
		function (userPackageName) {
			packageName = userPackageName || defaultPackageName;

			rl.question(`App name? [${name}] `, function (userAppName) {
				appName = userAppName || name;

				rl.close();
			});
		}
	);

	rl.on("close", createFiles);
}

async function createFiles() {
	console.log(
		"Downloading and extracting necessary files into android directory."
	);

	await downloadAndExtractFiles();

	replace.sync({
		files: [`${process.cwd()}/android/app/src/main/**`],
		from: [/com.rndiffapp/g],
		to: packageName,
	});

	replace.sync({
		files: [`${process.cwd()}/android/app/src/main/**`],
		from: [/rndiffapp/g],
		to: appName,
	});

	console.log("New architecture files created 🎉");
}

function downloadAndExtractFiles() {
	const jniRoot = `${process.cwd()}/android/app/src/main/`;
	const newArchRoot = `${process.cwd()}/android/app/src/main/java/com/${appName}/`;

	const stream = got.stream(
		"https://codeload.github.com/ahmetbicer/create-react-native-new-arch-files/tar.gz/master"
	);

	const jniExtract = new Promise((resolve, reject) => {
		stream.pipe(
			tar.extract({ cwd: jniRoot, strip: 2 }, [
				"create-react-native-new-arch-files-master/files/jni",
			])
		);
		stream.on("end", function () {
			resolve();
		});
	});

	const newArchExtract = new Promise((resolve, reject) => {
		stream.pipe(
			tar.extract({ cwd: newArchRoot, strip: 2 }, [
				"create-react-native-new-arch-files-master/files/newarchitecture",
			])
		);
		stream.on("end", function () {
			resolve();
		});
	});

	return Promise.all([jniExtract, newArchExtract]);
}

function isGitDirty() {
	const output = spawnSync("git", ["status", "--porcelain"]);
	if (output.status === 0) {
		return output.stdout.toString().trim().length > 0;
	}
}
