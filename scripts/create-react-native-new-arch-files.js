#!/usr/bin/env node

import { spawnSync } from "child_process";
import replace from "replace-in-file";
import readline from "readline";
import glob from "glob";
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

let mainComponentName, packageName, reactNativeVersion;

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
		console.error("Couldn't find package.json. Are you sure you are in the right directory?");
		process.exit(1);
	}

	const { dependencies } = JSON.parse(fs.readFileSync(packageJSONPath));

	reactNativeVersion = dependencies["react-native"];

	const [defaultPackageName, defaultMainComponentName] = findPackageAndMainComponentName();

	rl.question(`Package Name? [${defaultPackageName}] `, function (userPackageName) {
		packageName = userPackageName || defaultPackageName;

		rl.question(`Main Component Name? [${defaultMainComponentName}] `, function (userMainComponentName) {
			mainComponentName = userMainComponentName || defaultMainComponentName;

			rl.close();
		});
	});

	rl.on("close", createFiles);
}

async function createFiles() {
	await downloadAndExtractFiles();

	replace.sync({
		files: `${process.cwd()}/android/app/src/**`,
		from: [/com\.rndiffapp/g, /rndiffapp/g],
		to: [packageName, mainComponentName],
	});

	console.log("New architecture files created 🎉\n");
	console.log("But it doesn't end here. Go to react-native-upgrade-helper and make other changes.\n");
	console.log(`https://react-native-community.github.io/upgrade-helper/?from=${reactNativeVersion}&to=0.68.0-rc.3`);
}

function downloadAndExtractFiles() {
	const jniRoot = `${process.cwd()}/android/app/src/main/`;
	const newArchRoot = `${process.cwd()}/android/app/src/main/java/${packageName.replace(/\./g, "/")}/`;

	if (fs.existsSync(jniRoot + "jni")) {
		console.log("JNI folder already exists. Please check", jniRoot + "jni");
		process.exit(1);
	}

	if (fs.existsSync(newArchRoot + "newarchitecture")) {
		console.log("New architecture folder already exists. Please check", newArchRoot + "newarchitecture");
		process.exit(1);
	}

	console.log("Downloading and extracting necessary files into android directory.");

	const stream = got.stream(
		"https://codeload.github.com/ahmetbicer/create-react-native-new-arch-files/tar.gz/master"
	);

	const jniExtract = new Promise((resolve, reject) => {
		const jniPipe = stream.pipe(
			tar.extract({ cwd: jniRoot, strip: 2 }, ["create-react-native-new-arch-files-master/files/jni"])
		);

		jniPipe.on("finish", function () {
			resolve();
		});
	});

	const newArchExtract = new Promise((resolve, reject) => {
		const newArchPipe = stream.pipe(
			tar.extract({ cwd: newArchRoot, strip: 2 }, [
				"create-react-native-new-arch-files-master/files/newarchitecture",
			])
		);

		newArchPipe.on("finish", function () {
			resolve();
		});
	});

	return Promise.all([jniExtract, newArchExtract]);
}

function findPackageAndMainComponentName() {
	const [mainActivityFile] = glob.sync(`${process.cwd()}/android/**/MainActivity.java`);
	const mainActivityString = fs.readFileSync(mainActivityFile).toString();

	const packageNameRegex = /^package.*/;
	const mainComponentNameRegex = /return ".*"/;

	const [packageNameMatch] = mainActivityString.match(packageNameRegex);
	const [mainComponentMatch] = mainActivityString.match(mainComponentNameRegex);

	const [_, packageName] = packageNameMatch.replace(";", "").split(" ");
	const [__, mainComponentName] = mainComponentMatch.replace(/"/g, "").split(" ");

	return [packageName, mainComponentName];
}

function isGitDirty() {
	const output = spawnSync("git", ["status", "--porcelain"]);
	if (output.status === 0) {
		return output.stdout.toString().trim().length > 0;
	}
}
