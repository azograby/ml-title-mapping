'use client';

import { useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { AuthService } from '../../services/auth';
import { useSelector, useDispatch } from 'react-redux';
import { IUserStateReducer, authStoreActions } from "../../store/auth";
import { User } from '@/types/user';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const currentUser = useSelector((state:IUserStateReducer) => {
    return state.authReducer.user
  });
  const dispatch = useDispatch();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const isAuthenticated = await AuthService.isAuthenticated();
        console.log('isAuthenticated', isAuthenticated);
        if (isAuthenticated) {
          try {
            const identityId = await AuthService.getIdentityId();
            const user = await AuthService.getCurrentUser();
            dispatch(authStoreActions.setUser(new User(user.userId, user.username, user.signInDetails?.loginId || '', identityId || '')));
          } catch (error) {
            console.error('Error getting user details:', error);
          }
        }
      } catch (error) {
        console.log('Not authenticated', error);
        dispatch(authStoreActions.setUser(undefined));
      }
    };

    checkAuthStatus();
  }, []);

  // If authenticated, show the app
  if (currentUser) {
    return (
      <>
        {children}
      </>
    );
  } else { //If not authenticated, show the Authenticator
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
          <Authenticator>
            {(event) => {
              const user = event.user;
              if(user) {
                // TODO: NEED TO UPDATE IDENTITY ID
                dispatch(authStoreActions.setUser(new User(user.userId, user.username, user.signInDetails?.loginId || '', '')));
              } else {
                dispatch(authStoreActions.setUser(undefined));
              }
              return <></>;
            }}
          </Authenticator>
      </div>
    );
  }
}