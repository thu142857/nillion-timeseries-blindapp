import React, { useState } from 'react';
import * as nillion from '@nillion/client-web';
import Box from '@mui/material/Box';
import { List, ListItem, ListItemText } from '@mui/material';
import { Button } from "@nextui-org/react";
import {Input} from "@nextui-org/react";
import { toast } from 'react-toastify';

interface GenerateUserKeyProps {
    setUserKey: (key: string) => void;
    defaultUserKeySeed?: string;
}

const GenerateUserKey: React.FC<GenerateUserKeyProps> = ({
    setUserKey,
    defaultUserKeySeed = '',
}) => {
    const [userKeyBase58, setUserKeyBase58] = useState<string | null>(null);
    const [seed, setSeed] = useState<string>(defaultUserKeySeed);

    const handleGenerateUserKey = async (event: React.FormEvent) => {
        event.preventDefault();
        await nillion.default();
        if (!seed) {
            toast.error('Please enter a seed');
            return
        }
        // const userkey = seed
        //     ? nillion.UserKey.from_seed(seed)
        //     : nillion.UserKey.generate();
        // const userkey_base58 = userkey.to_base58();
        // setUserKeyBase58(userkey_base58);
    };

    const handleSetUserKey = (key: string) => {
        setUserKey(key);
    };

    const handleSeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSeed(event.target.value);
    };

    return (
        <Box my={2}>
            <h2 className='text-3xl font-bold mb-[16px]'>Connect with User Key</h2>
            <form onSubmit={handleGenerateUserKey}>
                <Box display="flex flex-col" alignItems="center">
                    <Input
                        key={'default'}
                        type="text"
                        color={'default'}
                        label="Your seed"
                        placeholder="my_seed"
                        defaultValue=""
                        className="max-w-[400px] mb-[16px]"
                        onChange={handleSeedChange}
                    />
                    <Button type="submit" color="primary">
                        Generate userkey
                    </Button>
                </Box>
            </form>
            {/* commented out until MM Snaps are upgraded for the key lib 2.0 update */}
            {/* <Button onClick={interactWithSnap} variant="contained" color="secondary">
                    Get User Key from MetaMask Snaps
                </Button>
            */}
            {userKeyBase58 && (
                <Box mt={2}>
                    <List>
                        <ListItem>
                            <ListItemText primary={`Generated User Key: ${userKeyBase58}`} />
                        </ListItem>
                    </List>
                    <Button
                        onClick={() => handleSetUserKey(userKeyBase58)}
                        color="primary"
                    >
                        Connect with user key
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default GenerateUserKey;
