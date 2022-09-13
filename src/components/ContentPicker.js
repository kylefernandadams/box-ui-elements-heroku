import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ContentPicker } from 'box-ui-elements';
import { ScaleLoader } from 'react-spinners';
import { THEME_COLOR, EXPRESS_SERVER_HOST } from '../Constants';
import client from "@salesforce/canvas-js-sdk";


export default ({  match, location, history }) => {
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [signedRequest, setSignedRequest] = useState();

    const folderId = new URLSearchParams(location.search).get('folderId').trim();
    const recordName = new URLSearchParams(location.search).get('recordName').trim();
    const userFullName = new URLSearchParams(location.search).get('userFullName').trim();


    async function handleChooseItems(items) {
        console.log('Selected: ', JSON.stringify(items, null, 2));

        const result = await axios.post(`${EXPRESS_SERVER_HOST}/box/shared/links`, { 
            recordName: recordName,
            userFullName: userFullName,
            items: items
        });     

        // client.publish(signedRequest.client, {
        //     name : "mynamespace.statusChanged", 
        //     payload : {status : 'Completed'}});

    }

    async function handleCancel(items) {
        console.log('Cancel: ', JSON.stringify(items, null, 2));
        setToken(token);
    }
    
    useEffect(() => {
        const fetchToken = async () => {
            setIsLoading(true);
            
            const result = await axios.get(`${EXPRESS_SERVER_HOST}/box/picker/token-downscope/${folderId}`);
            setToken(result.data.accessToken);
            setIsLoading(false);

            const signedRequestResult = await axios.get(`${EXPRESS_SERVER_HOST}/signedrequest`);
            console.log('REACT: Found sr: ', signedRequestResult.data);
            setSignedRequest(signedRequestResult.data);
        }
        fetchToken();

        
    }, []);
    if(token) {
        return (
                <div className="elements">
                <ContentPicker
                    logoUrl={""}
                    currentFolderId={folderId}
                    token={token}
                    canSetShareAccess={true}
                    canUpload={true}
                    canCreateNewFolder={true}
                    showSelectedButton={true}
                    onChoose={handleChooseItems}
                    clearSelectedItemsOnNavigation={true}
                    onCancel={handleCancel}
                />
                </div>
        );
    }
    else {
        return(
                <div className="elements">
                    <div className="spinner">
                        <ScaleLoader 
                            color={THEME_COLOR}
                            loading={isLoading}
                        />
                    </div>                
                </div>
        );
    }
};
