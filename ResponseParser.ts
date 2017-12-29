import { IOperationCommandFormat } from "./interfaces/IOperationCommandFormat";
import { IQueryCommandFormat } from "./interfaces/IQueryCommandFormat";

const mergeAttribsAndValues = (attribs: any[], DataRows: any[]) => {
  const merged: any[] = [];

  DataRows.forEach((row: any[]) => {
    if (attribs.length === row.length) {
      const newObj = {} as any;

      for (let i = 0; i < attribs.length; i += 1) {
        newObj[attribs[i].trim().replace(/\s/, "_")] = row[i];
      }
      merged.push(newObj);
    } else {
      throw new Error(`Quantidade de atributos ${attribs.length} diferente da quantidade de valores ${row.length}`);
    }
  });

  return merged;
};

export const operationCommand = (response: any): IOperationCommandFormat => {
  const regexStr =
    // header
    "[\\r\\n]*\\s{3}(.{1,})\\s(\\d{4})-(\\d{2})-(\\d{2})\\s(\\d{2}):(\\d{2}):(\\d{2})" +
    // response_id
    "\\r\\nM\\s{2}(\\w{1,})\\s(COMPLD|DELAY|DENY|PRTLRTRV)" +
    // response_block
    "\\r\\n\\s{3}EN=(.+)\\s{3}ENDESC=([\\w\\s=]+)" +
    // terminator
    "\\r\\n(;|>)";
  const regex = new RegExp(regexStr);
  const execResult = regex.exec(response);

  if (!execResult) {
    throw new Error(`regex.exec failed for: \n${response}`);
  }

  return {
    completion_code: execResult[9],
    ctag: execResult[8],
    day: execResult[4],
    error_code: execResult[10],
    error_description: execResult[11],
    hour: execResult[5],
    minute: execResult[6],
    month: execResult[3],
    second: execResult[7],
    sid: execResult[1],
    terminator: execResult[12],
    year: execResult[2],
  };
};

export const queryCommand = <T>(responseText: string): IQueryCommandFormat<T> => {
  const regexStr =
    // header
    "\\r\\n{2}\\s{3}(.{1,})\\s(\\d{4})-(\\d{2})-(\\d{2})\\s(\\d{2}):(\\d{2}):(\\d{2})" +
    // response id
    "\\r\\nM\\s{2}(\\w{1,})\\s(COMPLD|DELAY|DENY|PRTLRTRV)" +
    // response block
    "\\r\\n\\s{3}" +
    // quoted line
    "total_blocks=(\\d+)\\r\\n\\s{3}block_number=(\\d+)\\r\\n\\s{3}block_records=(\\d+)\\r\\n" +
    // result
    "\\r\\n([\\w\\s]+)\\r\\n";

  const regex = new RegExp(regexStr);
  const execResult = regex.exec(responseText);
  const terminatorRegex = /(;|>)$/;
  const terminatorRegexExec = terminatorRegex.exec(responseText);

  if (!terminatorRegexExec) {
    throw new Error(`regex.exec returned null for terminatorRegex: \n${responseText}`);
  }

  if (!execResult) {
    throw new Error(`Regex exec failed for: \n${responseText}`);
  }
  const parsedObj: IQueryCommandFormat<T> = {
    block_number: execResult[11],
    block_records: execResult[12],
    completion_code: execResult[9],
    ctag: execResult[8],
    day: execResult[4],
    hour: execResult[5],
    minute: execResult[6],
    month: execResult[3],
    second: execResult[7],
    sid: execResult[1],
    terminator: terminatorRegexExec[1],
    title: execResult[13],
    total_blocks: execResult[10],
    year: execResult[2],
  } as IQueryCommandFormat<T>;

  const dashedLineRegex = /\r\n-+\r\n/g;

  const firstDashedLine = dashedLineRegex.exec(responseText);
  if (!firstDashedLine) {
    throw new Error(`firstDashedLineRegex exec failed for: \n${responseText}`);
  }
  const start = firstDashedLine.index + firstDashedLine[0].length;

  const lastDashedLine = dashedLineRegex.exec(responseText);
  if (!lastDashedLine) {
    throw new Error(`lastDashedLineRegex exec failed for: \n${responseText}`);
  }
  const end = lastDashedLine.index;

  const strTabela = responseText.substring(start, end).trim();
  const linhasTabela: string[] = strTabela.split("\r\n");

  const arrayTabela: string[][] = linhasTabela.map((el: string): string[] => el.split("\t"));

  parsedObj.attribs = arrayTabela.shift() || [];
  parsedObj.values = mergeAttribsAndValues(parsedObj.attribs, arrayTabela);

  return parsedObj;
};
