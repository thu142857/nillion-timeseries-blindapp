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
import moment from 'moment';

export default function Home() {

    const [file, setFile] = useState(null);
    const [userkey, setUserKey] = useState<string | null>(null);
    const [client, setClient] = useState<NillionClient | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [partyId, setPartyId] = useState<string | null>(null);
    const [programTempId, setProgramTempId] = useState<string | null>(null);
    const [programId, setProgramId] = useState<string | null>(null);
    const [programQuote, setProgramQuote] = useState<any | null>(null);
    const [computeQuote, setComputeQuote] = useState<any | null>(null);

    // model store
    const [tempModelStoreId, setTempModelStoreId] = useState<string | null>(null);
    const [modelStoreId, setModelStoreId] = useState<string | null>(null);
    const [uploadModelQuote, setUploadModelQuote] = useState<any | null>(null);

    // trend secret store
    const [tempDataStoreId, setTempDataStoreId] = useState<string | null>(null);
    const [dataStoreId, setDataStoreId] = useState<string | null>(null);
    const [trendHours, setTrendHours] = useState<number | null>(null);
    const [trendQuote, setTrendQuote] = useState<any | null>(null);

    // loading state
    const [loadingProgramPayment, setLoadingProgramPayment] = useState(false);
    const [loadingComputePayment, setLoadingComputePayment] = useState(false);
    const [loadingSaveModelPayment, setLoadingSaveModelPayment] = useState(false);
    const [loadingSaveSecretVariablePayment, setLoadingSaveSecretVariablePayment] = useState(false);

    const [trendValues, setTrendValues] = useState<number[] | null>(null);

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

        toast.success('Getting quote...');

        try {
            const response = await axios.post('http://localhost:3000/api/upload-model', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success('Please confirm to pay to upload your model to Nillion Network.');

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
        } catch (error) {
            console.error(error);
        }

    };

    const confirmPayStoreModel = async (e: any) => {
        e.preventDefault();

        const [nilChainClient, nilChainWallet] =
            await createNilChainClientAndWalletFromPrivateKey();

        try {
            setLoadingSaveModelPayment(true);
            const txhash = await payWithWalletFromPrivateKey(
                nilChainClient,
                nilChainWallet,
                uploadModelQuote,
                true
            );

            toast.success(`Payment successful Txhash: ${txhash}. Please wait for storing your model on Nillion Network.`);

            const response = await axios.post('http://localhost:3000/api/store-model', {
                txhash: txhash as string,
                user_id: userId,
                nonce: uploadModelQuote.quote.nonce
            });

            if (!response.data) 
                throw new Error('No response data.');

            toast.success('Upload your model successfully.');
            setModelStoreId(response.data.store_id);
            setLoadingSaveModelPayment(false);
            setUploadModelQuote(null); // reset
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
            setLoadingSaveModelPayment(false);
            setUploadModelQuote(null); // reset
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
        toast.success('Paying for creating program...');

        const [nilChainClient, nilChainWallet] =
            await createNilChainClientAndWalletFromPrivateKey();

        setLoadingProgramPayment(true);
        const paymentReceipt = await payWithWalletFromPrivateKey(
            nilChainClient,
            nilChainWallet,
            programQuote
        );
        
        try {
            const program_id = await storeProgram({
                nillionClient: client as NillionClient,
                receipt: paymentReceipt as PaymentReceipt,
                programName: programName,
            });

            setProgramId(program_id);
            setProgramQuote(null); // reset
            toast.success('Program created successfully.');
            setLoadingProgramPayment(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
            setLoadingProgramPayment(false);
            setProgramQuote(null); // reset
        }
    }

    const getQuoteForm = async () => {
        toast.success('Getting quote for creating program...');

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
    }

    const handleTrendHoursChange = async (e: any) => {
        e.preventDefault();
        setTrendHours(parseInt(e.target.value) || 0);
    }

    const handleTrendSubmit = async (e: any) => {
        e.preventDefault();

        const params = {
            user_id: userId as string,
            program_id: programId as string,
            cluster_id: config.clusterId as string,
            user_key: userkey as string,
            hours: trendHours
        }

        toast.success('Getting quote...');

        try {
            const response = await axios.post('http://localhost:3000/api/getquote-store-data', params);

            toast.success('Please confirm to pay to store your secret data to Nillion Network.');

            if (!response.data) 
                throw new Error('No response data.');

            setTrendQuote({
                quote: {
                    cost: {
                        total: response.data.total
                    },
                    nonce: response.data.nonce
                }
            });
        } catch (error) {
            console.error(error);
        }

    }

    const confirmPayTrendQuote = async (e: any) => {
        e.preventDefault();

        setLoadingSaveSecretVariablePayment(true);
        const [nilChainClient, nilChainWallet] =
            await createNilChainClientAndWalletFromPrivateKey();

        try {
            const txhash = await payWithWalletFromPrivateKey(
                nilChainClient,
                nilChainWallet,
                trendQuote,
                true
            );

            toast.success(`Payment successful Txhash: ${txhash}. Please wait for storing your secret data.`);

            const response = await axios.post('http://localhost:3000/api/store-data', {
                txhash: txhash as string,
                user_id: userId,
                nonce: trendQuote.quote.nonce
            });

            if (!response.data) 
                throw new Error('No response data.');

            toast.success('Upload your model successfully.');
            setDataStoreId(response.data.store_id);
            setTrendQuote(null); // reset
            setLoadingSaveSecretVariablePayment(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
            setLoadingSaveSecretVariablePayment(false);
            setTrendQuote(null); // reset
        }
    }

    const compute = async (e: any) => {
        e.preventDefault();

        const partyName1 = 'ModelProvider';
        const partyName2 = 'UserProvider';

        setLoadingComputePayment(true);
        const [nilChainClient, nilChainWallet] =
            await createNilChainClientAndWalletFromPrivateKey();

        const paymentReceipt = await payWithWalletFromPrivateKey(
            nilChainClient,
            nilChainWallet,
            computeQuote
        );

        try {
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

            let trends: number[] = [];
            for (const key of Object.keys(value)) {
                const rescaledResult = parseFloat(value[key]) / Math.pow(2, 16);
                trends.push(rescaledResult);
            }
            setTrendValues(trends);
            setComputeQuote(null); // reset
            setLoadingComputePayment(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
            setComputeQuote(null); // reset
            setLoadingComputePayment(false);
        }
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

    const handleModelStoreIDChange = (e: any) => {
        e.preventDefault();
        setTempModelStoreId(e.target.value)
    }

    const saveModelStoreID = (e: any) => {
        e.preventDefault();
        setModelStoreId(tempModelStoreId);
    }

    const handleTrendStoreIDChange = (e: any) => {
        e.preventDefault();
        setTempDataStoreId(e.target.value)
    }

    const saveTrendStoreID = (e: any) => {
        e.preventDefault();
        setDataStoreId(tempDataStoreId);
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
                                    <Button className="py-[28px] px-[80px]" color="primary" type="submit" isDisabled={programTempId ? false : true}>
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
                                    <Button className="py-6 px-[20px] max-w-[400px]" color="primary" onClick={createNewProgram} isLoading={loadingProgramPayment}>
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
                        <div className="form-container flex flex-col gap-y-4 mt-[20px] border-t border-t-white pt-[20px]">
                            <label className="text-3xl font-bold">Upload your model:</label>
                            <input type="file" onChange={handleFileChange} accept=".pkl" />
                            <div className="btn-group flex flex-row gap-x-4">
                                <Button className="py-6 px-[80px]" color="primary" onClick={handleSubmit} isDisabled={file ? false : true}>
                                    Store
                                </Button>
                                {
                                    uploadModelQuote &&
                                    <Button className="py-6 px-[20px] max-w-[400px]" color="primary" onClick={confirmPayStoreModel} isLoading={loadingSaveModelPayment}>
                                        Confirm and Pay
                                    </Button>
                                }
                            </div>
                            <label className="text-3xl font-bold">Input the model store ID:</label>
                            <div className="btn-group flex flex-row gap-x-4">
                                <Input
                                    key={'default'}
                                    type="text"
                                    color={'default'}
                                    label="Model Store ID"
                                    placeholder="E.g. 5haYyUiTda..."
                                    defaultValue=""
                                    onChange={handleModelStoreIDChange}
                                />
                                <Button className="py-[28px] px-[40px] max-w-[400px]" color="primary" onClick={saveModelStoreID} isDisabled={tempModelStoreId ? false : true}>
                                    Save Model Store ID
                                </Button>
                            </div>
                            {
                                modelStoreId &&
                                <div className="text-white text-lg font-medium">
                                    Model Store ID: {modelStoreId}
                                </div>
                            }
                        </div>
                    }
                    {
                        modelStoreId &&
                        <div className="form-container flex flex-col gap-y-4 mt-[20px] border-t border-t-white pt-[20px]">
                            <label className="text-3xl font-bold">Next trend in hour:</label>
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
                                <Button className="py-6 px-[80px]" color="primary" onClick={handleTrendSubmit} isDisabled={trendHours && trendHours > 0 ? false : true}>
                                    Store
                                </Button>
                                {
                                    trendQuote &&
                                    <Button className="py-6 px-[20px] max-w-[400px]" color="primary" onClick={confirmPayTrendQuote} isLoading={loadingSaveSecretVariablePayment}>
                                        Confirm and Pay
                                    </Button>
                                }
                            </div>
                            <label className="text-3xl font-bold">Input the trend store ID:</label>
                            <div className="btn-group flex flex-row gap-x-4">
                                <Input
                                    key={'default'}
                                    type="text"
                                    color={'default'}
                                    label="Trend Store ID"
                                    placeholder="E.g. 5haYyUiTda..."
                                    defaultValue=""
                                    onChange={handleTrendStoreIDChange}
                                />
                                <Button className="py-[28px] px-[40px] max-w-[400px]" color="primary" onClick={saveTrendStoreID} isDisabled={tempDataStoreId ? false : true}>
                                    Save Trend Store ID
                                </Button>
                            </div>
                            {
                                dataStoreId &&
                                <div className="text-white text-lg font-medium">
                                    Data Store ID: {dataStoreId}
                                </div>
                            }
                        </div>
                    }
                    {
                        modelStoreId && dataStoreId &&
                        <div className="compute-btn-group flex flex-rol gap-x-4 border-t border-t-white pt-[20px]">
                            <Button className="py-6 px-[80px]" color="primary" onClick={handleGetComputeQuoteSubmit}>
                                Compute
                            </Button>
                            {
                                computeQuote &&
                                <Button className="py-6 px-[20px] max-w-[400px]" color="primary" onClick={compute} isLoading={loadingComputePayment}>
                                    Confirm computation
                                </Button>
                            }
                        </div>
                    }
                    {
                        trendValues &&
                        <div className="form-container flex flex-col gap-y-4 mt-[20px] border-t border-t-white pt-[20px]">
                            <label className="text-3xl font-bold">Result ETH Price Trend Prediction:</label>
                            <div className="text-white text-lg font-medium">
                                {
                                    trendValues.filter((value, index) => {
                                        const currentHour = moment().hour();
                                        if (currentHour === 23)
                                            return true;

                                        return index >= currentHour;
                                    }).map((value, index) => {

                                        const currentHour = moment().hour() >= 23 ? 0 : moment().hour();

                                        return (
                                            <div key={index}>
                                                Price trend at {parseInt(`${currentHour}`) + index}h: {Math.round(value * 100) / 100} USDT
                                            </div>
                                        )

                                    })
                                }
                            </div>
                        </div>
                    }
                </div>
            </div>
        </div>
    );

}
