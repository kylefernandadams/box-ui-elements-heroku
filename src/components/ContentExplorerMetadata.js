import React, { useState, useEffect } from 'react';

import axios from 'axios';
import { ContentExplorer } from 'box-ui-elements';
import { ScaleLoader } from 'react-spinners';
import { THEME_COLOR, EXPRESS_SERVER_HOST } from '../Constants';


export default ({  match, location, history }) => {
    const [token, setToken] = useState(null);
    const [rootFolderId, setRootFolderId] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const folderId = new URLSearchParams(location.search).get('folderId');
    const enterpriseId = new URLSearchParams(location.search).get('enterpriseId');
    const mdTemplateKey = new URLSearchParams(location.search).get('mdTemplateKey');
    const mdQueryString = new URLSearchParams(location.search).get('mdQuery');
    const mdQueryParamsString = new URLSearchParams(location.search).get('mdQueryParams');
    const mdFieldKeys = new URLSearchParams(location.search).get('mdFieldKeys');
    const mdFieldDisplayNames = new URLSearchParams(location.search).get('mdFieldDisplayNames');
    const mdOrderByFieldKey = new URLSearchParams(location.search).get('mdOrderByFieldKey');


    const eidAndMDTemplate = `enterprise_${enterpriseId}.${mdTemplateKey}`;

    const queryParams = {};
    const queryParamArray = mdQueryParamsString.split(',');
    queryParamArray.forEach(param => {
        queryParams[param] = param;
    });

    const fields = ['name', 'size'];
    const fieldsToShow = [];
    const fieldKeys = mdFieldKeys.split(',');
    const fieldDisplayNames = mdFieldDisplayNames.split(',');
    fieldKeys.forEach((fieldKey, index) => {
        const fieldDisplayName = fieldDisplayNames[index];
        fields.push(fieldKey);
        fieldsToShow.push({ key: fieldKey, displayName: fieldDisplayName});
    });

    const mdQuery = {
        from: eidAndMDTemplate,
        query: mdQueryString,
        query_params: queryParams,
        fields: fields,
        order_by:  [
        {
          field_key: mdOrderByFieldKey,
          direction: "asc"
        }
      ],
      ancestor_folder_id: '0'
    }

    const defaultView = "metadata";
    useEffect(() => {
        const fetchToken = async () => {
            setIsLoading(true);
            setRootFolderId(folderId);       
            const result = await axios.get(`${EXPRESS_SERVER_HOST}/box/explorer/token-downscope/${folderId}`);            

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
