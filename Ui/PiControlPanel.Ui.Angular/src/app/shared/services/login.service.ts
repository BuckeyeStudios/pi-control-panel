import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { get } from 'lodash';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { IUserAccount } from '../interfaces/userAccount';

@Injectable({
  providedIn: 'root',
})
export class LoginService {

  constructor(protected apollo: Apollo) { }

  login(userAccount: IUserAccount): Observable<string> {
    return this.apollo.query<{ login: string }>({
      query: gql`
        query login($userAccount: UserAccountInputType) {
          login(userAccount: $userAccount)
        }`,
      variables: {
        userAccount: {
          username: userAccount.username,
          password: userAccount.password
        }
      },
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => get(result.data, 'login')),
      catchError(this.handleError)
    );
  }

  private handleError(error) {
    return throwError('You could not be signed in to your account. Please check your username and password and try again.');
  };

}