'use client';
import ConnectionInfo from "@/components/commons/ConnectionInfo";
import CreateClient from "@/components/commons/CreateClient";
import GenerateUserKey from "@/components/commons/GenerateUserKey";
import { NillionClient } from "@nillion/client-web";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

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
            <div className="main__content flex flex-col justify-center items-start w-full bg-transparent max-w-[1280px] mx-auto mt-[100px] px-4 gap-y-[100px]">
                <h1 className="text-[60px] font-bold text-center text-white">
                    Coin Trend Prediction BlindApp
                </h1>
                <div className="main__content_description flex flex-col gap-y-[20px]">
                    <div className="nillion-user flex flex-col">
                        {
                            userkey && client && <ConnectionInfo client={client} userkey={userkey} />
                        }
                        <GenerateUserKey setUserKey={setUserKey} />
                        {userkey && <CreateClient userKey={userkey} setClient={setClient} />}
                    </div>
                    <div className="form-container">
                        <label>Upload your model</label>
                        <form onSubmit={handleSubmit}>
                            <input type="file" onChange={handleFileChange} />
                            <button type="submit">Upload</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );

}
