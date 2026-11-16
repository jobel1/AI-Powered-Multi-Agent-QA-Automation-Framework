
export interface LoginInputCase {
  name: string;
  username: string;
  password: string;
}

export const loginInputCases: LoginInputCase[] = [
  {
    name: 'Empty credentials',
    username: '',
    password: ''
  },
  {
    name: 'Missing password',
    username: 'standard_user',
    password: ''
  },
  {
    name: 'Invalid username',
    username: 'unknown_user',
    password: 'secret_sauce'
  },
  {
    name: 'Extremely long username',
    username: 'A'.repeat(2000),
    password: 'secret_sauce'
  },
  {
    name: 'Special characters',
    username: `test' " < > & /`,
    password: 'invalid-password'
  },
  {
    name: 'Unicode characters',
    username: 'u丂乇尺刀ﾑﾶ乇🙂',
    password: 'invalid-password'
  }
];
