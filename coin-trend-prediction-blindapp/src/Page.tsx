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
import { computeProgram } from "./nillion/helpers/compute";
import { config } from './nillion/helpers/nillion';
import { PaymentReceipt } from '@nillion/client-web';

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
    const [computeQuote, setComputeQuote] = useState<any | null>(null);

    const [uploadModelQuote, setUploadModelQuote] = useState<any | null>(null);

    const [trendHours, setTrendHours] = useState<number | null>(null);
    const [trendQuote, setTrendQuote] = useState<any | null>(null);

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

        const formData = new FormData();
        formData.append('file', file);
        formData.append('program_id', programId as string);
        formData.append('cluster_id', config.clusterId as string);
        formData.append('user_id', userId as string);
        formData.append('user_key', userkey as string);

        toast.success('Storing...');

        try {
            const response = await axios.post('http://localhost:3000/api/upload-model', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success('Please confirm to pay to upload your model to Nillion Network.');
            console.log(response.data);

            if (!response.data) 
                throw new Error('No response data.');

            setUploadModelQuote({
                quote: {
                    cost: {
                        total: response.data.total
                    },
                    nonce: response.data.nonce
                }
            })

            // setModelStoreId(response.data.model_store_id);
            // setDataStoreId(response.data.data_store_id);
        } catch (error) {
            console.error(error);
        }

    };

    const confirmPayStoreModel = async (e: any) => {
        e.preventDefault();

        const [nilChainClient, nilChainWallet] =
            await createNilChainClientAndWalletFromPrivateKey();

        try {
            const txhash = await payWithWalletFromPrivateKey(
                nilChainClient,
                nilChainWallet,
                uploadModelQuote,
                true
            );

            toast.success(`Payment successful Txhash: ${txhash}. Please wait for the confirmation.`);

            const response = await axios.post('http://localhost:3000/api/store-model', {
                txhash: txhash as string,
                user_id: userId,
                nonce: uploadModelQuote.quote.nonce
            });

            if (!response.data) 
                throw new Error('No response data.');

            toast.success('Upload your model successfully.');
            setModelStoreId(response.data.store_id);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        }

    }

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
            receipt: paymentReceipt as PaymentReceipt,
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

    const handleTrendSubmit = async (e: any) => {
        e.preventDefault();

    }

    const confirmPayTrendQuote = async (e: any) => {
        e.preventDefault();


    }

    const compute = async (e: any) => {
        e.preventDefault();

        const partyName1 = 'ModelProvider';
        const partyName2 = 'UserProvider';

        setLoadingPayment(true);
        const [nilChainClient, nilChainWallet] =
            await createNilChainClientAndWalletFromPrivateKey();

        const paymentReceipt = await payWithWalletFromPrivateKey(
            nilChainClient,
            nilChainWallet,
            computeQuote
        );

        const value = await computeProgram({
            nillionClient: client as NillionClient,
            receipt: paymentReceipt as PaymentReceipt,
            programId: programId as string,
            storeIds: [modelStoreId as string, dataStoreId as string],
            inputParties: [
                // Party0
                {
                  partyName: partyName1,
                  partyId: partyId as string,
                },
                // Party1
                {
                  partyName: partyName2,
                  partyId: partyId as string,
                },
            ],
            outputParties: [
                // Party1
                {
                    partyName: partyName2,
                    partyId: partyId as string,
                },
            ],
            outputName: 'coin_predict_output',
            additionalComputeValues: new nillion.NadaValues(),
        });

        console.log(value);

        // setComputeResult(value);

        // if (shouldRescale) {
        //     console.log(value);
        //     const rescaledResult = parseFloat(value) / Math.pow(2, 32);
        //     console.log(rescaledResult);
        //     setComputeResult(rescaledResult);
        // }

        // if (onComputeProgram) {
        //     onComputeProgram({ value });
        // }
        setLoadingPayment(false);
    }

    const handleGetComputeQuoteSubmit = async (e: any) => {
        e.preventDefault();

        await nillion.default();

        const additionalComputeValues = new nillion.NadaValues();

        const operation = nillion.Operation.compute(
            programId as string,
            additionalComputeValues
        );
        const quote = await getQuote({
            client: client as NillionClient,
            operation,
        });
        setComputeQuote({
            quote,
            quoteJson: quote.toJSON(),
            operation,
        });
    };

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
                            <div className="btn-group flex flex-row gap-x-4">
                                <Button className="py-6 px-[80px]" color="primary" onClick={handleSubmit} isDisabled={file ? false : true}>
                                    Store
                                </Button>
                                {
                                    uploadModelQuote &&
                                    <Button className="py-6 px-[20px] max-w-[400px]" color="primary" onClick={confirmPayStoreModel}>
                                        Confirm and Pay
                                    </Button>
                                }
                            </div>
                            {
                                modelStoreId &&
                                <div className="text-white text-lg font-medium">
                                    Model Store ID: {modelStoreId}
                                </div>
                            }
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
                            <div className="btn-group flex flex-row gap-x-4">
                                <Button className="py-[28px] px-[80px]" color="primary" onClick={handleTrendSubmit} isDisabled={trendHours && trendHours > 0 ? false : true}>
                                    Store
                                </Button>
                                {
                                    trendQuote &&
                                    <Button className="py-6 px-[20px] max-w-[400px]" color="primary" onClick={confirmPayTrendQuote}>
                                        Confirm and Pay
                                    </Button>
                                }
                            </div>
                            {
                                dataStoreId &&
                                <div className="text-white text-lg font-medium">
                                    Data Store ID: {dataStoreId}
                                </div>
                            }
                        </div>
                        </>
                    }
                    {
                        modelStoreId && dataStoreId &&
                        <Button className="py-[28px] px-[80px]" color="primary" onClick={handleGetComputeQuoteSubmit}>
                            Compute
                        </Button>
                    }
                    {
                        computeQuote &&
                        <Button className="py-6 px-[20px] max-w-[400px]" color="primary" onClick={compute}>
                            Confirm computation
                        </Button>
                    }
                </div>
            </div>
        </div>
    );

}
