
import * as path from 'path';
import {existsSync as fileExists} from 'fs';
import {EngineProcess, DEFAULT_ENGINE_CONSOLE_PORT} from './engine-process';

export interface LaunchConfiguration {
    tcPath: string;
    engineExe: string;
    port: number;
    commandLineArgs?: string[];
}

export class EngineLauncher {
    additionalCommandLineArgs: string[];
    private tcPath: string;
    private engineExe: string;
    private port: number;

    constructor (config: LaunchConfiguration) {
        const tcPath = config.tcPath;
        const engineExe = config.engineExe || "stingray_win64_dev_x64.exe";
        const port = config.port;

        if (!fileExists(tcPath))
            throw new Error(`Invalid ${tcPath} toolchain folder path`);

        this.tcPath = tcPath;
        this.engineExe = engineExe;
        this.port = port;
        this.additionalCommandLineArgs = config.commandLineArgs || [];
    }

    public start (compile: boolean): Promise<EngineProcess> {
        let engineExe = path.join(this.tcPath, 'engine', 'win64', 'dev', this.engineExe);
        let engineProcess = new EngineProcess(engineExe);
        let compilePromise = Promise.resolve();
        if (compile) {
            let engineArgs = [
                "--toolchain", `"${this.tcPath}"`,
                "--enable-remote-cache" ,
                "--enable-remote-cache-shaders" ,
                "--enable-console-log",
                "--no-continue",
                "--wait 10" // Wait for websocket connection before proceeding to not miss console output
            ];

            compilePromise = EngineProcess.run(engineExe, engineArgs);
        }

        return compilePromise.then(() => {
            let engineArgs = [
                "--toolchain", `"${this.tcPath}"`,
                "--port",`"${this.port}"`,
                "--no-compile",
                "--wait 10" // Wait for websocket connection before proceeding to not miss console output
            ];
            engineArgs = engineArgs.concat(this.additionalCommandLineArgs);
            engineProcess.start(engineArgs, this.port);
            return engineProcess;
        });
    }
}
