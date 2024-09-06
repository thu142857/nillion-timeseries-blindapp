import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#0021F5',
    },
    secondary: {
      main: '#fafafa',
    },
  },
  components: {
    MuiListItem: {
      styleOverrides: {
        root: {
          padding: '4px 16px', // Custom padding
          backgroundColor: 'black', // Custom background color
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          margin: '4px 0',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            margin: '4px 0',
            padding: '4px',
          },
          '& .MuiInputBase-input': {
            padding: '8px',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          marginTop: '0px',
          marginBottom: '0px',
          padding: '2px',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          padding: '4px',
        },
        select: {
          padding: '4px 8px',
        },
      },
    },
  },
});
