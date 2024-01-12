export const decodeBase64 = (str: string) => Buffer.from(str, 'base64').toString('utf-8');

export const getStringSizeInBytes = (str: string) => Buffer.byteLength(str, 'utf8');