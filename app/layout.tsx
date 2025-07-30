'use client';

// core styles are required for all packages
// import '@mantine/core/styles.css';
// import "./app.css";
// Supports weights 100-900
import '@fontsource-variable/raleway';

import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Button from '@mui/material/Button';
import HomeIcon from '@mui/icons-material/Home';
import VideoSettingsIcon from '@mui/icons-material/VideoSettings';
import { Backdrop, CircularProgress, Snackbar, Alert } from '@mui/material';
// import Drawer from '@mui/material/Drawer';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { Inter } from "next/font/google";
import { Providers } from "../components/providers/providers";
import React from 'react';
import { vars } from '../amplify/global-variables';
import { useRouter, usePathname } from 'next/navigation';
import "./globals.css";
import { AuthWrapper } from "../components/providers/auth-wrapper";
import LogMessages from "../components/log-output/log-output";

const drawerWidth = 180;

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  variants: [
    {
      props: ({ open }) => open,
      style: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
    },
  ],
}));
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  // padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

// Create a custom dark theme with modern, slick color scheme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8a2be2', // Vibrant purple
    },
    secondary: {
      main: '#00bcd4', // Cyan
    },
    background: {
      default: '#1a1a2e',
      paper: '#16213e',
    },
  },
  typography: {
    fontFamily: 'Raleway Variable',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          boxShadow: '0 3px 5px 2px rgba(15, 52, 96, 0.3)',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          borderRight: '1px solid rgba(138, 43, 226, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  
  const toggleDrawer = () => {
    setOpen(!open);
  };

  const handleNavigation = (link?: string) => {
    if (link) {
      router.push(`/${link}`);
    }
  };

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, link: '/' },
    { text: 'Ingest', icon: <CloudUploadIcon/>, link: 'ingest' },
    { text: 'Config', icon: <VideoSettingsIcon />, link: 'config' },
    { text: 'Mapper', icon: <DynamicFeedIcon />, link: 'mapper' },
  ];

  return (
    <Providers>
      <html lang="en">
        <head>
          <title>Title Mapping Solution</title>
        </head>
        <body>
          <ThemeProvider theme={darkTheme}>
          <AuthWrapper>
            <Box sx={{ display: 'flex' }}>
              <CssBaseline />
              <AppBar position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                  <IconButton
                    color="inherit"
                    aria-label="toggle drawer"
                    onClick={toggleDrawer}
                    edge="start"
                    sx={{ mr: 2 }}
                  >
                    <MenuIcon />
                  </IconButton>
                  <Typography variant="h6" noWrap component="div">
                    Title Mapper
                  </Typography>
                </Toolbar>
              </AppBar>
              
              <MuiDrawer
                variant="permanent"
                open={open}
                sx={{
                  width: open ? drawerWidth : darkTheme.spacing(0),
                  flexShrink: 0,
                  '& .MuiDrawer-paper': {
                    width: open ? drawerWidth : darkTheme.spacing(7),
                    overflowX: 'hidden',
                    transition: darkTheme.transitions.create('width', {
                      easing: darkTheme.transitions.easing.sharp,
                      duration: darkTheme.transitions.duration.enteringScreen,
                    }),
                  },
                }}
              >
                <DrawerHeader />
                <List>
                  {menuItems.map((item, index) => (
                    <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                      <ListItemButton
                        onClick={() => handleNavigation(item.link)}
                        sx={{
                          minHeight: 48,
                          justifyContent: open ? 'initial' : 'center',
                          px: 2.5,
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            mr: open ? 3 : 'auto',
                            justifyContent: 'center',
                            color: '#783AE0', // Changed to cyan color
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.text} 
                          // primaryTypographyProps={{
                          //   fontSize: 20,
                          //   fontWeight: 'medium',
                          //   letterSpacing: 0,
                          // }}
                          slotProps={{
                            primary: {
                              fontSize: 14,
                            },
                          }}
                          sx={{ display: open ? 'auto' : 'none' }}
                          
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </MuiDrawer>
              
              <Box component="main" sx={{ 
                flexGrow: 1, 
                // p: 3, 
                mt: 7.4, 
                ml: open ? 0 : 6,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                minHeight: 'calc(100vh - 64px)'
              }}>
                {children}
              </Box>
            </Box>
            

          </AuthWrapper>
          </ThemeProvider>
        </body>
      </html>
    </Providers>
  );
}
