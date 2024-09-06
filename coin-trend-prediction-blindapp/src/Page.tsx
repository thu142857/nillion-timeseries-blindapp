import React from "react";
import { NillionClient } from "@nillion/client-web";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ConnectionInfo from "./nillion/components/ConnectionInfo";
import GenerateUserKey from "./nillion/components/GenerateUserKey";
import CreateClient from "./nillion/components/CreateClient";
import { Button } from "@nextui-org/react";

export default function Home() {

    const [file, setFile] = useState(null);
    const [userkey, setUserKey] = useState<string | null>(null);
    const [client, setClient] = useState<NillionClient | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [partyId, setPartyId] = useState<string | null>(null);

    useEffect(() => {
        if (userkey && client) {
            setUserId(client.user_id);
            setPartyId(client.party_id);
        }
    }, [userkey, client]);

    const handleFileChange = (e: any) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!file) {
            toast.error('Please select your pre-trained model.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        console.log(file);
        
    };

    return (
        <div className="main flex flex-col min-h-[calc(100vh_-_117px)] w-full items-center">
            <div className="main__content flex flex-col justify-center w-full bg-transparent max-w-[1280px] mx-auto mt-[70px] px-4 gap-y-[100px]">
                <div className="text-[60px] font-bold text-center text-white">
                    Coin Trend Prediction BlindApp
                </div>
                <div className="main__content_description flex flex-col gap-y-[20px]">
                    <div className="nillion-user flex flex-col">
                        {
                            userkey && client && <ConnectionInfo client={client} userkey={userkey} />
                        }
                        <GenerateUserKey setUserKey={setUserKey} />
                        {userkey && <CreateClient userKey={userkey} setClient={setClient} />}
                    </div>
                    {
                        userkey && client && 
                        <div className="form-container flex flex-col gap-y-4">
                            <label className="text-3xl font-bold">Upload your model:</label>
                            <form className="flex flex-col gap-y-6" onSubmit={handleSubmit}>
                                <input type="file" onChange={handleFileChange} />
                                <Button className="py-6 max-w-[400px]" color="primary" type="submit">
                                    Upload
                                </Button>
                            </form>
                        </div>
                    }
                </div>
            </div>
        </div>
    );

}
