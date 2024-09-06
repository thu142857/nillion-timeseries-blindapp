import React from "react";
import { NillionClient } from "@nillion/client-web";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ConnectionInfo from "./nillion/components/ConnectionInfo";
import GenerateUserKey from "./nillion/components/GenerateUserKey";
import CreateClient from "./nillion/components/CreateClient";
import { Button, Input } from "@nextui-org/react";
import { storeProgram } from "./nillion/helpers/storeProgram";
import { transformNadaProgramToUint8Array } from "./nillion/helpers/transformNadaProgramToUint8Array";
import * as nillion from '@nillion/client-web';
import { getQuote } from "./nillion/helpers/getQuote";
import { createNilChainClientAndWalletFromPrivateKey, payWithWalletFromPrivateKey } from "./nillion/helpers/nillion";
import axios from "axios";

export default function Home() {

    const [file, setFile] = useState(null);
    const [userkey, setUserKey] = useState<string | null>(null);
    const [client, setClient] = useState<NillionClient | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [partyId, setPartyId] = useState<string | null>(null);
    const [programTempId, setProgramTempId] = useState<string | null>(null);
    const [programId, setProgramId] = useState<string | null>(null);
    const [loadingQuote, setLoadingQuote] = useState(false);
    const [programQuote, setProgramQuote] = useState<any | null>(null);
    const [loadingPayment, setLoadingPayment] = useState(false);
    const [modelTempStoreId, setTempModelStoreId] = useState<string | null>(null);
    const [trendHours, setTrendHours] = useState<number | null>(null);

    const [modelStoreId, setModelStoreId] = useState<string | null>(null);
    const [dataStoreId, setDataStoreId] = useState<string | null>(null);

    const programName = 'coin_predict';

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

        if (!trendHours || trendHours <= 0) {
            toast.error('Please enter a valid trend hours.');
            return
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('program_id', programId as string);
        formData.append('hours', trendHours.toString());

        toast.success('Storing...');

        try {
            const response = await axios.post('http://localhost:3000/api/store', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success('New Model stored successfully.');
            setModelStoreId(response.data.model_store_id);
            setDataStoreId(response.data.data_store_id);
        } catch (error) {
            console.error(error);
        }


        const partyName1 = 'ModelProvider';
        const partyName2 = 'UserProvider';



    };

    const handleProgramIDChange = (e: any) => {
        e.preventDefault();
        setProgramTempId(e.target.value);
    }

    const submitSaveProgramID = (e: any) => {
        e.preventDefault();
        if (!programTempId) {
            toast.error('Please enter a program ID');
            return;
        }
        setProgramId(programTempId);
    }

    const createNewProgram = async () => {
        setLoadingPayment(true);
        const [nilChainClient, nilChainWallet] =
            await createNilChainClientAndWalletFromPrivateKey();

        const paymentReceipt = await payWithWalletFromPrivateKey(
            nilChainClient,
            nilChainWallet,
            programQuote
        );
        
        const program_id = await storeProgram({
            nillionClient: client as NillionClient,
            receipt: paymentReceipt,
            programName: programName,
        });

        setProgramId(program_id);
        setLoadingPayment(false);
    }

    const getQuoteForm = async () => {
        setLoadingQuote(true);

        const programBinary = await transformNadaProgramToUint8Array(
            `/programs/${programName}.nada.bin`
        );
        const operation = nillion.Operation.store_program(programBinary);

        const quote = await getQuote({
            client: client as NillionClient,
            operation,
        });

        setProgramQuote({
            quote,
            quoteJson: quote.toJSON(),
            operation,
        });
        
        toast.success('Quote received successfully.');
        setLoadingQuote(false);
    }

    const handleTrendHoursChange = async (e: any) => {
        e.preventDefault();
        setTrendHours(parseInt(e.target.value) || 0);
    }

    const compute = async (e: any) => {
        e.preventDefault();

    }

    return (
        <div className="main flex flex-col min-h-[calc(100vh_-_117px)] w-full items-center">
            <div className="main__content flex flex-col justify-center w-full bg-transparent max-w-[1280px] mx-auto mt-[70px] mb-[120px] px-4 gap-y-[40px]">
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
                        <div className="flex flex-col gap-y-4">
                            <div className="flex flex-col gap-y-4">
                                <label className="text-3xl font-bold">Program ID (Optional):</label>
                                <form className="flex flex-row gap-x-4" onSubmit={submitSaveProgramID}>
                                    <Input
                                        key={'default'}
                                        type="text"
                                        color={'default'}
                                        label="Program ID"
                                        placeholder="5haYyUiTda..."
                                        defaultValue=""
                                        onChange={handleProgramIDChange}
                                    />
                                    <Button className="py-[28px] px-[80px]" color="primary" type="submit" disabled={programTempId ? false : true}>
                                        Save
                                    </Button>
                                </form>
                            </div>
                            <div className="flex flex-row gap-x-4">
                                <Button className="py-6 px-[20px] max-w-[400px]" color="primary" onClick={getQuoteForm}>
                                    Create New Program
                                </Button>
                                {
                                    programQuote &&
                                    <Button className="py-6 px-[20px] max-w-[400px]" color="primary" onClick={createNewProgram}>
                                        Confirm and Store Program
                                    </Button>
                                }
                            </div>
                            {
                                programId && 
                                <div className="text-white text-lg font-medium">
                                    Program ID: {programId}
                                </div>
                            }
                        </div>
                    }
                    {
                        userkey && client && programId && 
                        <>
                        <div className="form-container flex flex-col gap-y-4 mt-[20px]">
                            <label className="text-3xl font-bold">Upload your model:</label>
                            <input type="file" onChange={handleFileChange} accept=".pkl" />
                        </div>
                        <div className="form-container flex flex-col gap-y-4 mt-[20px]">
                            <label className="text-3xl font-bold">Trend in Next:</label>
                            <Input
                                key={'default'}
                                type="text"
                                color={'default'}
                                label="Hours"
                                placeholder="E.g. 24"
                                defaultValue=""
                                onChange={handleTrendHoursChange}
                            />
                            <Button className="py-[28px] px-[80px]" color="primary" onClick={handleSubmit} disabled={trendHours && trendHours > 0 ? false : true}>
                                Store
                            </Button>
                        </div>
                        </>
                    }
                    {
                        modelStoreId && dataStoreId &&
                        <>
                        <div className="text-white text-lg font-medium">
                            Model Store ID: {modelStoreId}
                        </div>
                        <div className="text-white text-lg font-medium">
                            Data Store ID: {dataStoreId}
                        </div>
                        <Button className="py-[28px] px-[80px]" color="primary" onClick={compute}>
                            Compute
                        </Button>
                        </>
                    }
                </div>
            </div>
        </div>
    );

}
