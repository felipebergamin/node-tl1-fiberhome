export interface IQueryCommandFormat<T> {
  block_number: string;
  block_records: string;
  completion_code: string;
  ctag: string;
  day: string;
  hour: string;
  minute: string;
  month: string;
  second: string;
  sid: string;
  terminator: string;
  title: string;
  total_blocks: string;
  year: string;
  attribs: string[];
  values: T[];
}
