import React, { useState, useEffect } from 'react';

import axios from 'axios';
import { ContentExplorer } from 'box-ui-elements';
import { ScaleLoader } from 'react-spinners';
import { THEME_COLOR, EXPRESS_SERVER_HOST, ENTERPRISE_ID, METADATA_TEMPLATE_KEY } from '../Constants';


export default ({ folderId, memberId }) => {
    const [token, setToken] = useState(null);
    const [rootFolderId, setRootFolderId] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const eidAndMDTemplate = `enterprise_${ENTERPRISE_ID}.${METADATA_TEMPLATE_KEY}`;

    const defaultView = "metadata";
    const mdQuery = {
        from: eidAndMDTemplate,
        query: `memberId = '123456'`,
        fields: [
            'name',
            'size',
            'id',
            'sha1',
            `metadata.${eidAndMDTemplate}.memberId`,
            `metadata.${eidAndMDTemplate}.documentType`
        ],
        order_by:  [
        {
          field_key: 'memberId',
          direction: "asc"
        }
      ],
      ancestor_folder_id: '0'
    }

    const fields = [
        { key: 'memberId', displayName: 'Member Id'},
        { key: 'documentType', displayName: 'Document Type'}
    ];

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
                fieldsToShow={fields}
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
