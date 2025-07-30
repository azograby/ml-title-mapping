"use client";
import * as React from "react";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ILogMessagesStateReducer } from "../../store/log-output";
import { logMessagesStoreActions } from "../../store/log-output";
import { LogOutputService } from "../../services/log-output";
import { IUserStateReducer } from "../../store/auth";
import { ILogMessageQueryOptions } from "@/types/log-output";

interface LogMessagesProps {
    
}

export default function LogMessages({ }: LogMessagesProps) {
  // get current user from store
  const currentUser = useSelector((state:IUserStateReducer) => {
    return state.authReducer.user
  });
  const dispatch = useDispatch();
  const logMessagesState = useSelector((state:ILogMessagesStateReducer) => {
    return state.logMessagesReducer
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.id || !logMessagesState.sessionId) return;

    setIsLoading(true);

    const fetchMessages = () => {
      const options = {
          sessionId: logMessagesState.sessionId,
          userId: currentUser?.id,
          limit: 50
      } as ILogMessageQueryOptions;
      LogOutputService.getRecentLogMessages(options).then((result) => {
        // TODO: comment back in later  
        // dispatch(logMessagesStoreActions.setMessages(result));
          setIsLoading(false);
      }).catch((error) => {
          console.log(error);
          setIsLoading(false);
      });
    };

    // Fetch messages immediately
    fetchMessages();

    // Set up interval to fetch messages every 10 seconds
    const intervalId = setInterval(fetchMessages, 10000);

    // Clean up interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [currentUser?.id, logMessagesState.sessionId, dispatch]);
  
  return (
    <>
    {/* <Box>
        <SpaceBetween
          size="l"
          direction="vertical"
        > */}
            {/* {isLoading && (
                <Box textAlign="center">
                    <SpaceBetween size="xs" direction="vertical" >
                        <Spinner size="normal" />
                        <Box variant="p">Loading messages...</Box>
                    </SpaceBetween>
                </Box>
            )} */}
            {!isLoading && (
                <>
                    {logMessagesState.messages.map((message) => (
                        <div style={{width: '100%'}} key={`${message?.sessionId}-${message?.createdAt}`}>
                            <p className={message.type === 'error' ? 'message-error' : ''}>{message?.message}</p>
                            <small>
                                {new Date(message?.createdAt).toLocaleString()}
                            </small>
                        </div>
                    ))}
                    {logMessagesState.messages.length === 0 && (
                        <p>No processing messages</p>
                    )}
                </>
            )}
        {/* </SpaceBetween>
    </Box> */}
    </>
  );
}