import Debug = require("debug");
import { Socket } from "net";

import { TimeoutError } from "./errors/TimeoutError";
import parser = require("./ResponseParser");

import { IAddOnuParams } from "./interfaces/IAddOnuParams";
import { IConfigureLanPort } from "./interfaces/IConfigureLanPort";
import { IConfigureWanParams } from "./interfaces/IConfigureWanParams";
import { IDelOnuParams } from "./interfaces/IDelOnuParams";
import { IListOMDDMResponse } from "./interfaces/IListOMDDMResponse";
import { IListOpticalModuleDDMParams } from "./interfaces/IListOpticalModuleDDMParams";
import { IListUnregOnuParams } from "./interfaces/IListUnregOnuParams";
import { ILstUnregOnuResponse } from "./interfaces/ILstUnregOnuResponse";
import { IOperationCommandFormat } from "./interfaces/IOperationCommandFormat";
import { IQueryCommandFormat } from "./interfaces/IQueryCommandFormat";
import { IResponse } from "./interfaces/IResponse";

const debug = Debug("node-tl1-fiberhome");

export class TL1Client {
  private s: Socket;
  private ip: string;
  private port: number;

  constructor(ip: string, port: number = 3337) {
    debug(`constructor ip ${ip} port ${port}`);
    this.ip = ip;
    this.port = port;
    this.s = new Socket();
    this.s.setTimeout(5000);
  }

  get socket() {
    return this.s;
  }

  public connect(): Promise<any> {
    debug("connect()");
    return new Promise((resolve: () => void, reject: (err: Error) => void) => {
      const onError = (err: Error) => {
        this.s.destroy();
        reject(err);
      };

      const onConnect = () => {
        this.s.removeListener("error", onError);
        resolve();
      };

      this.s.once("error", onError);
      this.s.connect(this.port, this.ip, onConnect);
    });
  }

  public execute(cmd: string): Promise<any> {
    debug("execute()");

    return new Promise((resolve: (val: any) => void, reject: (err: any) => void) => {
      const onError = (err: Error) => {
        debug(`error: ${err.name} - ${err.message}`);
        this.socket.removeAllListeners("data");
        this.socket.removeAllListeners("timeout");
        reject(err);
      };

      const onTimeout = () => onError(new TimeoutError());

      const onData = (data: any) => {
        debug("data received");
        this.socket.removeListener("error", onError);
        this.socket.removeListener("timeout", onTimeout);
        resolve(data);
      };

      this.s.once("error", onError);
      this.s.once("timeout", onTimeout);
      this.s.once("data", onData);

      debug("write command");
      this.s.write(cmd);
    });
  }

  public async login(user: string, passwd: string, ctag: string = "LGN")
    : Promise<{ responseString: string, parsedResponse: IOperationCommandFormat }> {
    debug("login()");
    const query = `LOGIN:::${ctag}::UN=${user},PWD=${passwd};`;
    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async logout(ctag: string = "LGT")
    : Promise<IResponse<IOperationCommandFormat>> {
    debug("logout()");
    const query = `LOGOUT:::${ctag}::;`;
    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async handShake(ctag: string = "HNDSHK"): Promise<IResponse<IOperationCommandFormat>> {
    debug("handshake()");
    const query = `SHAKEHAND:::${ctag}::;`;
    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async lstOpticalModuleDDM(params: IListOpticalModuleDDMParams, ctag: string = "LSTD")
    : Promise<IResponse<IQueryCommandFormat<IListOMDDMResponse>>> {

    const targetIdAcceptParams = [
      "ONUIP", "OLTID", "PONID", "ONUIDTYPE", "ONUID", "PORTID", "PEERFLAG",
    ];
    const targetIdentifier = this.processParams(targetIdAcceptParams, params);

    const query = `LST-OMDDM::${targetIdentifier}:${ctag}::;`;
    let responseString: string = "";

    try {
      const response = await this.execute(query);

      responseString = response.toString();
      const parsedResponse = parser.queryCommand<IListOMDDMResponse>(responseString);

      return { responseString, parsedResponse };
    } catch (err) {
      if (parser.matchDenyResponse(responseString)) {
        throw parser.operationCommand(responseString);
      }
      throw err;
    }
  }

  public async lstUnregisteredOnu(params: IListUnregOnuParams, ctag: string = "LSTUN")
    : Promise<IResponse<IQueryCommandFormat<ILstUnregOnuResponse>>> {

    const acceptParams = ["OLTID", "PONID"];
    const targetIdentifier = this.processParams(acceptParams, params);

    const query = `LST-UNREGONU::${targetIdentifier}:${ctag}::;`;
    let responseString: string = "";

    try {
      const response = await this.execute(query);

      responseString = response.toString();
      const parsedResponse = parser.queryCommand<ILstUnregOnuResponse>(responseString);

      return { responseString, parsedResponse };
    } catch (err) {
      if (parser.matchDenyResponse(responseString)) {
        throw parser.operationCommand(responseString);
      }
      throw err;
    }
  }

  public async addOnu(params: IAddOnuParams, ctag: string = "ADDONU")
    : Promise<IResponse<IOperationCommandFormat>> {

    const targetIdAcceptParams = [
      "OLTID", "PONID",
    ];
    const datablocksAcceptParams = [
      "AUTHTYPE", "ONUID", "PWD", "ONUNO", "NAME", "DESC", "ONUTYPE",
    ];
    const targetIdentifier = this.processParams(targetIdAcceptParams, params);
    const datablocks = this.processParams(datablocksAcceptParams, params);

    const query = `ADD-ONU::${targetIdentifier}:${ctag}::${datablocks};`;

    const response = await this.execute(query);

    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async deleteOnu(params: IDelOnuParams, ctag: string = "DELONU")
    : Promise<IResponse<IOperationCommandFormat>> {

    const targetIdAcceptParams = [
      "OLTID", "PONID",
    ];
    const datablocksAcceptParams = [
      "ONUIDTYPE", "ONUID",
    ];

    const targetIdentifier = this.processParams(targetIdAcceptParams, params);
    const datablocks = this.processParams(datablocksAcceptParams, params);

    const query = `DEL-ONU::${targetIdentifier}:${ctag}::${datablocks};`;

    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async configureWanConnection(params: IConfigureWanParams, ctag: string = "CFGWAN")
    : Promise<IResponse<IOperationCommandFormat>> {

    const targetIdAcceptParams = [
      "ONUIP", "OLTID", "PONID", "ONUIDTYPE", "ONUID",
    ];
    const datablocksAcceptParams = [
      "STATUS", "MODE", "CONNTYPE", "VLAN", "COS", "QOS", "NAT", "IPMODE", "WANIP",
      "WANMASK", "WANGATEWAY", "MASTERDNS", "SLAVEDNS", "PPPOEPROXY", "PPPOEUSER",
      "PPPOEPASSWD", "PPPOENAME", "PPPOEMODE", "UPORT", "SSID", "WANSVC",
      "UPPROFILENAME", "DOWNPROFILENAME",
    ];

    const targetIdentifier = this.processParams(targetIdAcceptParams, params);
    const datablocks = this.processParams(datablocksAcceptParams, params);

    const query = `SET-WANSERVICE::${targetIdentifier}:${ctag}::${datablocks};`;
    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async configureLanPort(params: IConfigureLanPort, ctag: string = "CFGLAN")
    : Promise<IResponse<IOperationCommandFormat>> {

    const targetIdAcceptParams = [
      "ONUIP", "OLTID", "PONID", "ONUIDTYPE", "ONUID", "ONUPORT",
    ];
    const datablocksAcceptParams = [
      "BW", "VLANMOD", "PVID", "PCOS",
    ];

    const targetIdentifier = this.processParams(targetIdAcceptParams, params);
    const datablocks = this.processParams(datablocksAcceptParams, params);

    const query = `CFG-LANPORT::${targetIdentifier}:${ctag}::${datablocks};`;
    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public end() {
    this.s.end();
    this.s.destroy();
  }

  private processParams(acceptParams: any[], receivedParams: any): string {
    const validParams: string[] = [];

    acceptParams.forEach((param: any) => {
      if (param in receivedParams) {
        validParams.push(`${param}=${receivedParams[param]}`);
      }
    });

    return validParams.join(",");
  }
}
