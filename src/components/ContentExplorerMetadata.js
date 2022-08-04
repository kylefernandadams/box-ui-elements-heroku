import React, { useState, useEffect } from 'react';

import axios from 'axios';
import { ContentExplorer } from 'box-ui-elements';
import { ScaleLoader } from 'react-spinners';
import { THEME_COLOR, EXPRESS_SERVER_HOST } from '../Constants';


export default ({  match, location, history }) => {
    const [token, setToken] = useState(null);
    const [rootFolderId, setRootFolderId] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const enterpriseId = new URLSearchParams(location.search).get('enterpriseId').trim();
    const mdTemplateKey = new URLSearchParams(location.search).get('mdTemplateKey').trim();
    const mdQueryParamFieldKey = new URLSearchParams(location.search).get('mdQueryParamFieldKey').trim();
    const mdQueryParamOperator = new URLSearchParams(location.search).get('mdQueryParamOperator').trim();
    const mdQueryParamValue = new URLSearchParams(location.search).get('mdQueryParamValue').trim();

    const mdFieldKeys = new URLSearchParams(location.search).get('mdFieldKeys').trim();
    const mdFieldDisplayNames = new URLSearchParams(location.search).get('mdFieldDisplayNames').trim();
    const mdOrderByFieldKey = new URLSearchParams(location.search).get('mdOrderByFieldKey').trim();


    const eidAndMDTemplate = `enterprise_${enterpriseId}.${mdTemplateKey}`;

    const fields = [];
    const fieldsToShow = [];
    const fieldKeys = mdFieldKeys.split(',');
    const fieldDisplayNames = mdFieldDisplayNames.split(',');
    fieldKeys.forEach((fieldKey, index) => {
        const fieldDisplayName = fieldDisplayNames[index];
        fields.push(fieldKey);
        fieldsToShow.push({ key: fieldKey, displayName: fieldDisplayName, canEdit: true} );
    });

    
    const mdQuery = {
        from: eidAndMDTemplate,
        fields: fields,
        ancestor_folder_id: '0',
        order_by:  [
            {
              field_key: mdOrderByFieldKey,
              direction: "asc"
            }
          ]
    };

    console.log('FOund md query field value: ', mdQueryParamValue);
    console.log('md field value length: ', mdQueryParamValue.length);
    if(typeof mdQueryParamValue !== 'undefined' && mdQueryParamValue !== 'undefined' && mdQueryParamValue) {
        mdQuery['query'] = `${mdQueryParamFieldKey} ${mdQueryParamOperator} :value`;       
        mdQuery['query_params'] = { value: mdQueryParamValue};
    } else {
        mdQuery['query'] = `${mdQueryParamFieldKey} ${mdQueryParamOperator}`;       
    }
    
   

    console.log('Using metadata query: ', JSON.stringify(mdQuery));

    const defaultView = "metadata";
    useEffect(() => {
        const fetchToken = async () => {
            setIsLoading(true);
            const result = await axios.get(`${EXPRESS_SERVER_HOST}/box/metadata/token-downscope`);            

            setToken(result.data.accessToken);
            setIsLoading(false);
        }
        fetchToken();
    }, []);
    if(token) {
        console.log('Loading UI Element...');

        return (
            <div className="elements">
            <ContentExplorer
                language="en-US"
                token={token}
                metadataQuery={mdQuery}
                fieldsToShow={fieldsToShow}
                defaultView={defaultView}
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
